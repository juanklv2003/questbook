import { PDFParse } from 'pdf-parse';
import type { QuestionBankLine } from '../domain/questionBank';

/**
 * Lector de líneas del PDF para el modo banco de preguntas.
 *
 * El subrayado no existe en la capa de texto (el PDF no trae anotaciones ni
 * códigos de subrayado), así que hay que mirar los pixels: se renderiza la
 * página y, debajo de la línea base de cada renglón, se busca una corrida oscura
 * horizontal que cubra más de la mitad del ancho del renglón. Ese método se
 * validó contra el PDF real (60 líneas subrayadas en 8 páginas, coincidiendo con
 * lo que se ve a ojo, incluidos los casos con las cuatro opciones subrayadas).
 *
 * `pdfjs-dist` y `@napi-rs/canvas` se cargan con `require` porque ambos son
 * ESM-only y el backend compila a CommonJS. Node 24 permite requerir ESM, así
 * que funciona sin tocar el módulo del proyecto.
 */

interface CanvasImage {
  width: number;
  height: number;
}

interface CanvasContext2D {
  drawImage(image: CanvasImage, x: number, y: number): void;
  getImageData(
    x: number,
    y: number,
    width: number,
    height: number
  ): { width: number; height: number; data: Uint8ClampedArray };
}

interface CanvasHandle {
  getContext(kind: '2d'): CanvasContext2D;
}

interface CanvasModule {
  createCanvas(width: number, height: number): CanvasHandle;
  loadImage(source: Uint8Array): Promise<CanvasImage>;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
}

interface PdfPage {
  getViewport(params: { scale: number }): { width: number; height: number };
  getTextContent(): Promise<{ items: PdfTextItem[] }>;
  cleanup?(): void;
}

interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
  destroy?(): Promise<void>;
}

interface PdfJsModule {
  getDocument(source: { data: Uint8Array }): { promise: Promise<PdfDocument> };
}

const pdfjs = require('pdfjs-dist/legacy/build/pdf.mjs') as PdfJsModule;
const canvasLib = require('@napi-rs/canvas') as CanvasModule;

/** Suficiente para que una raya de 1pt ocupe al menos 2 filas de pixels. */
const RENDER_SCALE = 2;

/** Un renglón es una línea visual si su baseline cae dentro de esta tolerancia. */
const LINE_Y_TOLERANCE_PX = 4;

/** Franja debajo de la baseline donde vive el subrayado (en pixels renderizados). */
const UNDERLINE_SCAN_START_PX = 1;
const UNDERLINE_SCAN_END_PX = 6;

/** Se saltea el arranque del renglón (`●`, viñeta) para no contar su tinta. */
const LINE_X_INSET_PX = 8;

/** Proporción del ancho del renglón que debe estar oscura para llamarlo subrayado. */
const UNDERLINE_DARK_RATIO = 0.5;

const DARK_CHANNEL_MAX = 120;

function isDarkPixel(data: Uint8ClampedArray, index: number): boolean {
  return (
    (data[index] ?? 255) < DARK_CHANNEL_MAX &&
    (data[index + 1] ?? 255) < DARK_CHANNEL_MAX &&
    (data[index + 2] ?? 255) < DARK_CHANNEL_MAX
  );
}

interface VisualLine {
  y: number;
  x0: number;
  x1: number;
  parts: string[];
}

function groupIntoLines(items: PdfTextItem[], pageHeightPt: number): VisualLine[] {
  const lines: VisualLine[] = [];
  for (const item of items) {
    if (!item.str || !item.str.trim()) continue;
    const transform = item.transform;
    if (!transform || transform.length < 6) continue;

    const x = transform[4] * RENDER_SCALE;
    const y = (pageHeightPt - transform[5]) * RENDER_SCALE;
    const width = Math.max(0, item.width ?? 0) * RENDER_SCALE;

    const line = lines.find((candidate) => Math.abs(candidate.y - y) < LINE_Y_TOLERANCE_PX);
    if (line) {
      line.parts.push(item.str);
      line.x0 = Math.min(line.x0, x);
      line.x1 = Math.max(line.x1, x + width);
      continue;
    }
    lines.push({ y, x0: x, x1: x + width, parts: [item.str] });
  }
  lines.sort((a, b) => a.y - b.y);
  return lines;
}

function detectUnderline(
  line: VisualLine,
  data: Uint8ClampedArray,
  width: number,
  height: number
): boolean {
  const startX = Math.round(line.x0 + LINE_X_INSET_PX);
  const endX = Math.min(Math.round(line.x1), width);
  if (endX - startX < 8) return false;

  let best = 0;
  for (let dy = UNDERLINE_SCAN_START_PX; dy <= UNDERLINE_SCAN_END_PX; dy += 1) {
    const y = Math.round(line.y + dy);
    if (y <= 0 || y >= height) continue;
    const rowStart = y * width;
    let dark = 0;
    for (let x = startX; x < endX; x += 1) {
      if (isDarkPixel(data, (rowStart + x) * 4)) dark += 1;
    }
    const ratio = dark / (endX - startX);
    if (ratio > best) best = ratio;
  }
  return best > UNDERLINE_DARK_RATIO;
}

async function readPageLines(
  parser: PDFParse,
  page: PdfPage,
  pageNumber: number
): Promise<QuestionBankLine[]> {
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const screenshot = await parser.getScreenshot({
    partial: [pageNumber],
    scale: RENDER_SCALE,
    imageDataUrl: false,
    imageBuffer: true,
  });
  const shot = screenshot.pages[0];
  if (!shot) return [];

  const image = await canvasLib.loadImage(Buffer.from(shot.data as Uint8Array));
  const canvas = canvasLib.createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height);

  const text = await page.getTextContent();
  const lines = groupIntoLines(text.items ?? [], viewport.height / RENDER_SCALE);

  return lines.map((line) => ({
    page: pageNumber,
    text: line.parts.join('').replace(/\s+/g, ' ').trim(),
    underlined: detectUnderline(line, pixels.data, pixels.width, pixels.height),
  }));
}

/**
 * Devuelve todas las líneas visuales del PDF, en orden, con la marca de
 * subrayado ya resuelta.
 */
export async function readQuestionBankLines(bytes: Uint8Array): Promise<QuestionBankLine[]> {
  // pdf-parse se queda con la propiedad del array: se le pasa una copia y el
  // original queda para pdfjs, que necesita las mismas coordenadas de texto.
  const parser = new PDFParse({ data: new Uint8Array(bytes) });
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;

  try {
    const lines: QuestionBankLine[] = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      lines.push(...(await readPageLines(parser, page, pageNumber)));
      page.cleanup?.();
    }
    return lines;
  } finally {
    await parser.destroy();
    await document.destroy?.();
  }
}
