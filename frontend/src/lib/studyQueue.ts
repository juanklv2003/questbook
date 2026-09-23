import { shuffled } from './shuffle';

/** Mueve la carta actual (cabeza) al final de la cola. */
export function deferHead(queue: readonly string[]): string[] {
  if (queue.length === 0) return [];
  const [head, ...rest] = queue;
  return [...rest, head];
}

/** Elimina la carta actual de la cola (dada por completada en esta sesión). */
export function completeHead(queue: readonly string[]): string[] {
  return queue.slice(1);
}

/** Pone una carta al frente de la cola (lista de repaso). */
export function bringToFront(queue: readonly string[], cardId: string): string[] {
  if (!queue.includes(cardId)) return [...queue];
  return [cardId, ...queue.filter((id) => id !== cardId)];
}

export function initStudyQueue(ids: readonly string[], shuffle: boolean): string[] {
  const copy = [...ids];
  return shuffle ? shuffled(copy) : copy;
}

/** Resume de sesiones guardadas sin `queueIds` (solo currentIndex lineal). */
export function rebuildQueueFromLegacy(
  orderedIds: readonly string[],
  currentIndex: number,
  finished: boolean
): string[] {
  if (finished || orderedIds.length === 0) return [];
  const start = Math.min(Math.max(0, currentIndex), orderedIds.length);
  return orderedIds.slice(start);
}

export function isValidQueueForDeck(queue: readonly string[], deckIds: readonly string[]): boolean {
  if (queue.length === 0) return true;
  const deckSet = new Set(deckIds);
  const seen = new Set<string>();
  for (const id of queue) {
    if (!deckSet.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}
