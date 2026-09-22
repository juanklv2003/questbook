const GEMINI_MAX_OUTPUT_TOKENS = 65_536;

/**
 * Budget de tokens de salida por tanda de mazo.
 *
 * Verificado con la clave del proyecto (GET /v1beta/models, 2026-09-18): todos
 * los modelos flash/pro disponibles reportan `outputTokenLimit = 65 536`, así
 * que pasar un `maxOutputTokens` alto es válido (antes no se enviaba y la API
 * usaba su default de 8 192, que truncaba el JSON de las tandas difíciles).
 * Si algún día se configura `GEMINI_MODEL` con un modelo de menor tope, hay que
 * revisar su `outputTokenLimit` en https://ai.google.dev/gemini-api/docs/models
 */
export function deckBatchMaxOutputTokens(
  cardCount: number,
  difficulty?: 'easy' | 'medium' | 'hard'
): number {
  const perCard = difficulty === 'hard' ? 1_100 : difficulty === 'easy' ? 650 : 850;
  return Math.min(GEMINI_MAX_OUTPUT_TOKENS, 2_048 + cardCount * perCard);
}
