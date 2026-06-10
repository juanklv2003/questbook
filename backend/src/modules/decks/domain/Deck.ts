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
}
