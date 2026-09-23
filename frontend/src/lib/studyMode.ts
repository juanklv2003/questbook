export type StudyMode = 'ai' | 'quick';

const STORAGE_KEY = 'andel:studyMode';

export function readStudyMode(): StudyMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'ai' || saved === 'quick') return saved;
  } catch {
    // ignore
  }
  return 'ai';
}

export function writeStudyMode(mode: StudyMode): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}
