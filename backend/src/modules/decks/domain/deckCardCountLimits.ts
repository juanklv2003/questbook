import { AppError } from '../../../core/errors/AppError';

/**
 * Tope de tarjetas por mazo.
 *
 * Subió de 50 a 100 por el modo banco de preguntas: un examen real trae ~75
 * consignas numeradas y cada una es una tarjeta, así que el tope anterior
 * cortaba el PDF por la mitad.
 */
export const DECK_CARD_COUNT_MAX = 100;

/**
 * Valida el `cardCount` que llega por multipart/JSON.
 *
 * `undefined` significa "sin tope explícito" y lo resuelve el generador con su
 * default. Un valor fuera de rango corta con 400 y el mismo texto de antes.
 */
export function parseDeckCardCount(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > DECK_CARD_COUNT_MAX) {
    throw new AppError(400, `cardCount must be between 1 and ${DECK_CARD_COUNT_MAX}`);
  }
  return parsed;
}

/**
 * Bandera del modo banco de preguntas.
 *
 * Llega como string desde multipart (`'true'`, `'1'`, `'on'`). Cualquier otro
 * valor se considera apagado: el modo cambia cómo se leen las respuestas, así
 * que un valor dudoso nunca lo activa.
 */
export function parseQuestionBankFlag(raw: unknown): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw !== 'string') return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'on';
}
