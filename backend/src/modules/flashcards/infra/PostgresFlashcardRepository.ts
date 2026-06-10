import { Pool } from '@neondatabase/serverless';
import { Flashcard } from '../domain/Flashcard';
import { IFlashcardRepository } from '../domain/IFlashcardRepository';

export class PostgresFlashcardRepository implements IFlashcardRepository {
  constructor(private readonly db: Pool) {}

  async createMany(flashcards: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Flashcard[]> {
    if (flashcards.length === 0) return [];

    // Building a parameterized query for bulk insert
    const values: any[] = [];
    const placeholders: string[] = [];
    
    flashcards.forEach((card, index) => {
      const offset = index * 3;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
      values.push(card.deckId, card.question, card.answer);
    });

    const query = `
      INSERT INTO flashcards (deck_id, question, answer)
      VALUES ${placeholders.join(', ')}
      RETURNING id, deck_id AS "deckId", question, answer, created_at AS "createdAt", updated_at AS "updatedAt"
    `;

    const result = await this.db.query<Flashcard>(query, values);
    return result.rows;
  }

  async findByDeckId(deckId: string): Promise<Flashcard[]> {
    const query = `
      SELECT id, deck_id AS "deckId", question, answer, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM flashcards
      WHERE deck_id = $1
      ORDER BY created_at ASC
    `;
    const result = await this.db.query<Flashcard>(query, [deckId]);
    return result.rows;
  }

  async findById(id: string): Promise<Flashcard | null> {
    const query = `
      SELECT id, deck_id AS "deckId", question, answer, created_at AS "createdAt", updated_at AS "updatedAt"
      FROM flashcards
      WHERE id = $1
    `;
    const result = await this.db.query<Flashcard>(query, [id]);
    return result.rows[0] || null;
  }
}
