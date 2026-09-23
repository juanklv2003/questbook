import { useCallback, useState } from 'react';
import { readStudyMode, writeStudyMode, type StudyMode } from '../lib/studyMode';

export function useStudyMode() {
  const [studyMode, setStudyModeState] = useState<StudyMode>(() => readStudyMode());

  const setStudyMode = useCallback((mode: StudyMode) => {
    setStudyModeState(mode);
    writeStudyMode(mode);
  }, []);

  return { studyMode, setStudyMode };
}
