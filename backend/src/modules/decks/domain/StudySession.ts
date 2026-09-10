/** Resumable per-user study progress for a deck. Never auto-deleted. */
export interface StudySession {
  userId: string;
  deckId: string;
  currentIndex: number;
  /** Map of flashcardId -> was the last answer correct. */
  results: Record<string, boolean>;
  flashcardsHash: string | null;
  finished: boolean;
  createdAt: Date;
  updatedAt: Date;
}
