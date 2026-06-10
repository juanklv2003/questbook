export interface Deck {
  id: string;
  name: string;
  flashcardsCount: number;
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
