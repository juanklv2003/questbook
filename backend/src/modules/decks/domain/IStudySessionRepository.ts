import { StudySession } from './StudySession';

export interface SaveStudySessionInput {
  userId: string;
  deckId: string;
  currentIndex: number;
  results: Record<string, boolean>;
  flashcardsHash?: string | null;
  finished?: boolean;
}

export interface IStudySessionRepository {
  find(userId: string, deckId: string): Promise<StudySession | null>;
  upsert(input: SaveStudySessionInput): Promise<StudySession>;
  delete(userId: string, deckId: string): Promise<void>;
}
