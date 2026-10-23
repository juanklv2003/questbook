export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GenerateOptions {
  cardCount?: number;
  difficulty?: Difficulty;
  language?: 'en' | 'es';
}

/**
 * Consigna ya extraída del PDF en modo banco de preguntas.
 *
 * `question` y `answer` salen literales del bloque de esa consigna. El generador
 * sólo puede reescribir `question`: la respuesta nunca la escribe el modelo, así
 * que no hay forma de que invente o mezcle conceptos de otra sección.
 */
export interface QuestionBankSourceItem {
  number: number;
  question: string;
  answer: string;
}

export interface IFlashcardGeneratorPort {
  generateFromText(text: string, options?: GenerateOptions): Promise<Array<{ question: string; answer: string }>>;

  /**
   * Reescribe cada consigna "un poco distinto" sin cambiar el contenido y devuelve
   * la tarjeta con la respuesta original del PDF.
   */
  paraphraseQuestions(
    items: QuestionBankSourceItem[],
    options?: GenerateOptions
  ): Promise<Array<{ question: string; answer: string }>>;
}
