import { useEffect, useState } from 'react';

/** Móvil/tablet estrecho o ventana baja: lista de preguntas con scroll interno. */
const COMPACT_MQ = '(max-width: 1023px), (max-height: 740px)';

export function useStudyCompactLayout(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(COMPACT_MQ).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_MQ);
    const onChange = () => setCompact(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return compact;
}
