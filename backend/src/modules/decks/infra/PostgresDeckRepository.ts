import { Pool } from '@neondatabase/serverless';
import { Deck } from '../domain/Deck';
import { IDeckRepository } from '../domain/IDeckRepository';

export class PostgresDeckRepository implements IDeckRepository {
  constructor(private readonly db: Pool) {}

  async create(deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deck> {
    const shelfIndex = deck.shelfIndex ?? 0;
    const position = deck.position ?? 0;
    // New books land first (position 0): shift existing books on the target shelf down.
    await this.db.query(
      `UPDATE decks SET position = position + 1, updated_at = NOW()
       WHERE user_id = $1 AND COALESCE(shelf_index, 0) = $2`,
      [deck.userId, shelfIndex]
    );
    const query = `
      INSERT INTO decks (name, user_id, folder_id, pdf_url, pdf_public_id, shelf_index, position)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, user_id AS "userId", folder_id AS "folderId", pdf_url AS "pdfUrl", pdf_public_id AS "pdfPublicId", shelf_index AS "shelfIndex", position AS "position", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [deck.name, deck.userId, deck.folderId || null, deck.pdfUrl || null, deck.pdfPublicId || null, shelfIndex, position];

    const result = await this.db.query<Deck>(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Deck | null> {
    const query = `
      SELECT id, name, user_id AS "userId", folder_id AS "folderId", pdf_url AS "pdfUrl", pdf_public_id AS "pdfPublicId", shelf_index AS "shelfIndex", position AS "position", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM decks
      WHERE id = $1
    `;
    const result = await this.db.query<Deck>(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(userId: string): Promise<Deck[]> {
    const query = `
      SELECT 
        d.id, 
        d.name, 
        d.user_id AS "userId",
        d.folder_id AS "folderId",
        d.pdf_url AS "pdfUrl",
        d.pdf_public_id AS "pdfPublicId",
        d.shelf_index AS "shelfIndex",
        d.position AS "position",
        d.created_at AS "createdAt", 
        d.updated_at AS "updatedAt",
        (SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id)::int AS "flashcardsCount"
      FROM decks d
      WHERE d.user_id = $1
      ORDER BY COALESCE(d.shelf_index, 0) ASC, COALESCE(d.position, 0) ASC, d.created_at DESC
    `;
    const result = await this.db.query<Deck>(query, [userId]);
    return result.rows;
  }

  async delete(deckId: string): Promise<void> {
    const query = `
      DELETE FROM decks WHERE id = $1
    `;
    await this.db.query(query, [deckId]);
  }

  async updateShelf(deckId: string, shelfIndex: number, position: number): Promise<Deck | null> {
    const query = `
      UPDATE decks
      SET shelf_index = $2, position = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING id, name, user_id AS "userId", folder_id AS "folderId", pdf_url AS "pdfUrl", pdf_public_id AS "pdfPublicId", shelf_index AS "shelfIndex", position AS "position", created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const result = await this.db.query<Deck>(query, [deckId, shelfIndex, position]);
    return result.rows[0] || null;
  }
}
