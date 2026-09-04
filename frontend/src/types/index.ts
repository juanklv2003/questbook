export interface Deck {
  id: string;
  name: string;
  flashcardsCount: number;
  /** 0-based shelf (balda). Null/undefined = legacy deck, shown on shelf 0. */
  shelfIndex?: number | null;
  /** 0-based order within the shelf (left to right). Null/undefined keeps server order. */
  position?: number | null;
  /** Snake_case aliases as returned by legacy payloads. Prefer camelCase. */
  shelf_index?: number | null;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  deckId: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  score: number;
  feedback: string;
}

export interface User {
  id: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DeckGenerationOptions {
  name: string;
  cardCount: number;
  difficulty: Difficulty;
}
