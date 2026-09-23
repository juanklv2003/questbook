import { Pool } from '@neondatabase/serverless';
import { Deck } from '../domain/Deck';
import { IDeckRepository } from '../domain/IDeckRepository';
import { AppError } from '../../../core/errors/AppError';

export class PostgresDeckRepository implements IDeckRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Accuracy % from deck counters (IA / modo rápido) or, si aún no hay
   * contadores, desde la sesión guardada (results JSONB).
   */
  private static progressForDeckOnly(alias: string): string {
    return `CASE WHEN ${alias}.studied_count = 0 THEN NULL ELSE ROUND(100.0 * ${alias}.correct_count / ${alias}.studied_count)::int END`;
  }

  private static progressForList(deckAlias: string, sessionAlias: string): string {
    return `
      COALESCE(
        ${PostgresDeckRepository.progressForDeckOnly(deckAlias)},
        CASE
          WHEN ${sessionAlias}.results IS NOT NULL
            AND ${sessionAlias}.results <> '{}'::jsonb
          THEN (
            SELECT ROUND(
              100.0 * SUM(CASE WHEN (e.value)::boolean THEN 1 ELSE 0 END)
              / NULLIF(COUNT(*), 0)
            )::int
            FROM jsonb_each(${sessionAlias}.results) AS e(key, value)
          )
        END
      ) AS "progressPercent"`;
  }

  private static progressFor(alias: string): string {
    return `${PostgresDeckRepository.progressForDeckOnly(alias)} AS "progressPercent"`;
  }
  async create(deck: Omit<Deck, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deck> {
    const shelfIndex = deck.shelfIndex ?? 0;
    const position = deck.position ?? 0;
    // New books land first (position 0): shift existing books on the target
    // shelf down. El UPDATE y el INSERT van en UN solo statement (CTE con
    // writes) → es una única transacción implícita: si el INSERT falla, el
    // shift de posiciones también se revierte (antes eran dos queries sueltas
    // y un error dejaba las posiciones corridas).
    const query = `
      WITH shifted AS (
        UPDATE decks
        SET position = position + 1, updated_at = NOW()
        WHERE user_id = $1 AND COALESCE(shelf_index, 0) = $2
      )
      INSERT INTO decks (name, user_id, folder_id, pdf_url, pdf_public_id, shelf_index, position, color)
      VALUES ($3, $1, $4, $5, $6, $2, $7, $8)
      RETURNING id, name, user_id AS "userId", folder_id AS "folderId", pdf_url AS "pdfUrl", pdf_public_id AS "pdfPublicId", shelf_index AS "shelfIndex", position AS "position", color, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const values = [
      deck.userId,
      shelfIndex,
      deck.name,
      deck.folderId || null,
      deck.pdfUrl || null,
      deck.pdfPublicId || null,
      position,
      deck.color ?? 'primary',
    ];

    const result = await this.db.query<Deck>(query, values);
    return result.rows[0];
  }

  async findById(id: string): Promise<Deck | null> {
    const query = `
      SELECT id, name, user_id AS "userId", folder_id AS "folderId", pdf_url AS "pdfUrl", pdf_public_id AS "pdfPublicId", shelf_index AS "shelfIndex", position AS "position", color, studied_count AS "studiedCount", correct_count AS "correctCount", ${PostgresDeckRepository.progressFor('decks')}, created_at AS "createdAt", updated_at AS "updatedAt"
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
        d.color,
        d.studied_count AS "studiedCount",
        d.correct_count AS "correctCount",
        ${PostgresDeckRepository.progressForList('d', 'ss')},
        d.created_at AS "createdAt", 
        d.updated_at AS "updatedAt",
        COALESCE(fc.cnt, 0) AS "flashcardsCount"
      FROM decks d
      LEFT JOIN study_sessions ss ON ss.deck_id = d.id AND ss.user_id = d.user_id
      LEFT JOIN (
        SELECT deck_id, COUNT(*)::int AS cnt FROM flashcards GROUP BY deck_id
      ) fc ON fc.deck_id = d.id
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
      RETURNING id, name, user_id AS "userId", folder_id AS "folderId", pdf_url AS "pdfUrl", pdf_public_id AS "pdfPublicId", shelf_index AS "shelfIndex", position AS "position", color, studied_count AS "studiedCount", correct_count AS "correctCount", ${PostgresDeckRepository.progressFor('decks')}, created_at AS "createdAt", updated_at AS "updatedAt"
    `;
    const result = await this.db.query<Deck>(query, [deckId, shelfIndex, position]);
    return result.rows[0] || null;
  }

  async recordEvaluation(deckId: string, isCorrect: boolean): Promise<{ deckId: string; progressPercent: number | null }> {
    const query = `
      UPDATE decks
      SET studied_count = studied_count + 1,
          correct_count = correct_count + CASE WHEN $2 THEN 1 ELSE 0 END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id AS "deckId", ${PostgresDeckRepository.progressFor('decks')}
    `;
    const result = await this.db.query<{ deckId: string; progressPercent: number | null }>(query, [deckId, isCorrect]);
    const row = result.rows[0];
    if (!row) {
      throw new AppError(404, 'Deck not found');
    }
    return row;
  }
}
