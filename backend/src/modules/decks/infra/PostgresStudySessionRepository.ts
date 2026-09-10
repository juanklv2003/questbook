import { Pool } from '@neondatabase/serverless';
import { StudySession } from '../domain/StudySession';
import { IStudySessionRepository, SaveStudySessionInput } from '../domain/IStudySessionRepository';

export class PostgresStudySessionRepository implements IStudySessionRepository {
  constructor(private readonly db: Pool) {}

  async find(userId: string, deckId: string): Promise<StudySession | null> {
    const result = await this.db.query(
      `SELECT user_id AS "userId", deck_id AS "deckId",
              current_index AS "currentIndex", results,
              flashcards_hash AS "flashcardsHash", finished,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM study_sessions
       WHERE user_id = $1 AND deck_id = $2`,
      [userId, deckId]
    );
    return result.rows[0] || null;
  }

  async upsert(input: SaveStudySessionInput): Promise<StudySession> {
    const result = await this.db.query(
      `INSERT INTO study_sessions (user_id, deck_id, current_index, results, flashcards_hash, finished, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW())
       ON CONFLICT (user_id, deck_id)
       DO UPDATE SET current_index = EXCLUDED.current_index,
                     results = EXCLUDED.results,
                     flashcards_hash = EXCLUDED.flashcards_hash,
                     finished = EXCLUDED.finished,
                     updated_at = NOW()
       RETURNING user_id AS "userId", deck_id AS "deckId",
                 current_index AS "currentIndex", results,
                 flashcards_hash AS "flashcardsHash", finished,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        input.userId,
        input.deckId,
        input.currentIndex,
        JSON.stringify(input.results ?? {}),
        input.flashcardsHash ?? null,
        input.finished ?? false,
      ]
    );
    return result.rows[0];
  }

  async delete(userId: string, deckId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM study_sessions WHERE user_id = $1 AND deck_id = $2`,
      [userId, deckId]
    );
  }
}
