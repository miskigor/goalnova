type Listener = () => void;

const listeners = new Set<Listener>();

/** Call after answering today's quiz so nav badges refresh. */
export function notifyDailyQuizStatusChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDailyQuizStatusChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
