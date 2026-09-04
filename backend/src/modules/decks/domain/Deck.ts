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
}
