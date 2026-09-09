export interface Deck {
  id: string;
  name: string;
  userId: string;
  folderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  flashcardsCount?: number;
  pdfUrl?: string;
  pdfPublicId?: string;
  /** 0-based shelf (balda) where the book sits. Null = legacy deck, treated as shelf 0. */
  shelfIndex?: number | null;
  /** 0-based order within the shelf (left to right). Null = legacy deck, keeps incoming order. */
  position?: number | null;
  /** Cumulative evaluated answers for this deck. 0 = never studied. */
  studiedCount?: number;
  /** Cumulative correct answers for this deck. */
  correctCount?: number;
  /** round(100*correct/studied). Null when studiedCount is 0 (no data yet). */
  progressPercent?: number | null;
}
