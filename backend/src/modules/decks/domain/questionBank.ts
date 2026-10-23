/**
 * Banco de preguntas: tipos y parser de bloques numerados.
 *
 * El parser es puro a propósito. Recibe líneas ya extraídas del PDF (con la
 * bandera de subrayado resuelta por el lector de pixels) y devuelve una tarjeta
 * por consigna. Nada de IA acá: la respuesta siempre sale del propio bloque, así
 * que es imposible que mezcle conceptos entre secciones.
 */

/** Una línea visual del PDF, con la marca de subrayado ya detectada. */
export interface QuestionBankLine {
  /** Página 1-based; sólo para trazar. */
  page: number;
  text: string;
  underlined: boolean;
}

export interface QuestionBankOption {
  /** `a`, `b`, `c`… tal como aparece en el PDF. */
  label: string;
  text: string;
  /** Subrayada, o marcada con `V` cuando el bloque no usa subrayado. */
  correct: boolean;
}

export interface QuestionBankItem {
  /** Número de la consigna en el PDF (1-based, tal como está impreso). */
  number: number;
  /** Enunciado original, sin el número. */
  question: string;
  /** Respuesta armada desde el bloque: opciones correctas u párrafo original. */
  answer: string;
  multipleChoice: boolean;
  correctOptionCount: number;
  /**
   * Verdadero cuando es multiple choice pero no se pudo leer ninguna marca
   * (ni subrayado ni `V`). La tarjeta se arma igual con todas las opciones.
   */
  unmarkedMultipleChoice: boolean;
}

const ITEM_START = /^(\d{1,3})\s*[.)]\s*/;
const OPTION_START = /^[●•‧∙]\s*([^\s.·)\-]{1,3})\s*[.)]\s*/;
const OPTION_BULLET_ONLY = /^[●•‧∙]\s*/;
/**
 * Marca final `V`/`F`. Permite cola corta de artefactos: al extraer el texto, los
 * superíndices quedan pegados al final (`...en la llamaV𝑛`), así que exigir el
 * fin de línea exacto perdería marcas reales.
 */
const TRAILING_MARK = /([VF])(?:[^A-Za-z]{0,4})$/;
const MARK_STRIP = /\s*[VF](?:[^A-Za-z]{0,4})$/;

/** Un salto de numeración mayor a esto no es una consigna nueva: es una subparte. */
const MAX_ITEM_NUMBER_JUMP = 3;

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Marca final de una opción. `V` = correcta, `F` = incorrecta.
 *
 * Sólo `V` cuenta como respuesta correcta: en los bloques sin subrayado la `F`
 * marca las opciones falsas, que no deben aparecer en la respuesta.
 */
function trailingMark(text: string): 'V' | 'F' | null {
  const match = text.match(TRAILING_MARK);
  return match ? (match[1] as 'V' | 'F') : null;
}

interface PendingOption {
  label: string;
  parts: string[];
  underlined: boolean;
}

interface PendingItem {
  number: number;
  question: string;
  body: string[];
  options: PendingOption[];
}

function startItem(number: number, firstLine: string): PendingItem {
  return { number, question: normalize(firstLine), body: [], options: [] };
}

function finalizeItem(pending: PendingItem): QuestionBankItem | null {
  const options = pending.options
    .map((option) => ({ ...option, text: normalize(option.parts.join(' ')) }))
    .filter((option) => option.text.length > 0);

  let question = normalize(pending.question);
  const body = pending.body.map(normalize).filter(Boolean);

  // Consigna sin texto en la línea del número: la primera línea del cuerpo es el
  // enunciado y el resto la respuesta.
  if (!question && body.length > 0) {
    question = body.shift() ?? '';
  }
  if (!question) return null;

  if (options.length >= 2) {
    const usesUnderline = options.some((option) => option.underlined);
    // El subrayado gana sobre `V`/`F`: los bloques con subrayado también arrastran
    // artefactos de superíndice que parecen una marca (`...incidenteV90`).
    const marked = usesUnderline
      ? options.filter((option) => option.underlined)
      : options.filter((option) => trailingMark(option.text) === 'V');

    const cleaned = options.map((option) => ({
      label: option.label,
      text: normalize(
        usesUnderline ? option.text : option.text.replace(MARK_STRIP, '')
      ),
    }));

    const chosen = marked.length > 0 ? cleaned.filter((_, i) => marked.includes(options[i])) : cleaned;
    const answer = chosen
      .map((option) => `${option.label}) ${option.text}`)
      .join('\n')
      .trim();

    if (!answer) return null;
    return {
      number: pending.number,
      question,
      answer,
      multipleChoice: true,
      correctOptionCount: marked.length,
      unmarkedMultipleChoice: marked.length === 0,
    };
  }

  const paragraph = normalize(
    [...options.map((option) => option.text), ...body].join(' ')
  );
  if (!paragraph) return null;
  return {
    number: pending.number,
    question,
    answer: paragraph,
    multipleChoice: false,
    correctOptionCount: 0,
    unmarkedMultipleChoice: false,
  };
}

/**
 * Agrupa líneas en consignas numeradas.
 *
 * Reglas que salen del propio PDF:
 * - una línea que empieza con `N.` o `N)` abre consigna, siempre que el número
 *   avance respecto de la anterior (las subpartes no son consignas nuevas);
 * - una línea que empieza con `●` abre opción; el resto se acumula como
 *   continuación de la opción anterior o como cuerpo de la respuesta;
 * - una opción se considera correcta si alguna de sus líneas está subrayada.
 */
export function parseQuestionBankLines(lines: QuestionBankLine[]): QuestionBankItem[] {
  const items: QuestionBankItem[] = [];
  let pending: PendingItem | null = null;
  let lastNumber = 0;

  const flush = () => {
    if (!pending) return;
    const item = finalizeItem(pending);
    if (item) items.push(item);
    pending = null;
  };

  for (const line of lines) {
    const text = normalize(line.text);
    if (!text) continue;

    const itemMatch = text.match(ITEM_START);
    if (itemMatch) {
      const number = Number(itemMatch[1]);
      const advances = items.length === 0 && !pending
        ? true
        : number > lastNumber && number - lastNumber <= MAX_ITEM_NUMBER_JUMP;
      if (advances) {
        flush();
        lastNumber = number;
        pending = startItem(number, text.slice(itemMatch[0].length));
        continue;
      }
    }

    if (!pending) continue;

    const optionMatch = text.match(OPTION_START);
    if (optionMatch) {
      pending.options.push({
        label: optionMatch[1].toLowerCase(),
        parts: [text.slice(optionMatch[0].length)],
        underlined: line.underlined,
      });
      continue;
    }

    if (OPTION_BULLET_ONLY.test(text)) {
      pending.options.push({
        label: '',
        parts: [text.replace(OPTION_BULLET_ONLY, '')],
        underlined: line.underlined,
      });
      continue;
    }

    const lastOption = pending.options[pending.options.length - 1];
    if (lastOption) {
      // Línea envuelta de la opción: hereda la marca de subrayado de la primera.
      lastOption.parts.push(text);
      lastOption.underlined = lastOption.underlined || line.underlined;
      continue;
    }

    pending.body.push(text);
  }

  flush();
  return items;
}
