export interface Deck {
  id: string;
  name: string;
  flashcardsCount: number;
  /** 0-based shelf (balda). Null/undefined = legacy deck, shown on shelf 0. */
  shelfIndex?: number | null;
  /** 0-based order within the shelf (left to right). Null/undefined keeps server order. */
  position?: number | null;
  /** 0–100 study progress. Absent/null = not tracked yet (progress UI hidden). */
  progressPercent?: number | null;
  /** Spine accent chosen at creation. Null/undefined = legacy deck, falls back to name hash. */
  color?: string | null;
  /** PDF filenames merged into this book (new decks). */
  pdfSourceNames?: string[] | null;
  /** Snake_case aliases as returned by legacy payloads. Prefer camelCase. */
  shelf_index?: number | null;
  pdf_source_names?: string[] | null;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  deckId: string;
}

export interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
  /** Deck this evaluation counted towards (persisted progress). */
  deckId?: string;
  /** Recalculated deck progress (0–100) after this evaluation. Null = no data yet. */
  deckProgress?: number | null;
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
  /** Token de Cloudflare Turnstile. El backend lo verifica en siteverify; es de un solo uso. */
  turnstileToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
  /** Token del widget Turnstile (solo paso 1). Mismo site key que el registro. */
  turnstileToken: string;
}

export interface ForgotPasswordResponse {
  resetToken: string;
  expiresAt: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

/** Gemini free-tier quota hint returned by the API on HTTP 429. */
export interface QuotaExceededInfo {
  retryAfterSeconds: number;
  /** ISO timestamp when generation can be retried. */
  resetAt: string;
}

/**
 * Gemini model saturation hint returned by the API on HTTP 503.
 * Same countdown shape as the quota notice; kept as an alias so both
 * flows share the mm:ss alert without duplicating logic.
 */
export type ModelOverloadedInfo = QuotaExceededInfo;

export interface DeckGenerationOptions {
  name: string;
  cardCount: number;
  difficulty: Difficulty;
  color?: string;
  language?: 'en' | 'es';
}

export interface GenerateDeckResult {
  deckId: string;
  name: string;
  flashcardsCount: number;
  color?: string;
  pdfSourceNames?: string[];
}
