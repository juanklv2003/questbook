import path from 'path';

const MAX_PDF_SOURCES = 20;
const MAX_NAME_LEN = 255;

export function sanitizePdfDisplayName(originalname?: string | null): string {
  const base = path.basename((originalname ?? '').trim() || 'documento.pdf');
  const cleaned = base.replace(/[^\w.\-()\sáéíóúñÁÉÍÓÚÑ]/g, '_').trim();
  const clipped = cleaned.slice(0, MAX_NAME_LEN);
  return clipped || 'documento.pdf';
}

export function normalizePdfSourceNames(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const name = sanitizePdfDisplayName(item);
    if (!out.includes(name)) out.push(name);
    if (out.length >= MAX_PDF_SOURCES) break;
  }
  return out;
}

/** Parses multipart/json body field (`pdf_source_names` as JSON string or array). */
export function parsePdfSourceNamesField(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    try {
      return normalizePdfSourceNames(JSON.parse(trimmed));
    } catch {
      return normalizePdfSourceNames([trimmed]);
    }
  }
  if (Array.isArray(raw)) return normalizePdfSourceNames(raw);
  return undefined;
}
