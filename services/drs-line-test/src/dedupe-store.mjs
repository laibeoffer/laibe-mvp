const DEFAULT_TTL_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_MAX_ENTRIES = 10_000;

export function createDedupeStore({
  ttlMs = DEFAULT_TTL_MS,
  maxEntries = DEFAULT_MAX_ENTRIES,
  now = Date.now,
} = {}) {
  const entries = new Map();

  const prune = (currentTime) => {
    for (const [eventId, entry] of entries) {
      if (entry.expiresAt <= currentTime) entries.delete(eventId);
    }
  };

  const evictOldestCompleted = () => {
    for (const [eventId, entry] of entries) {
      if (entry.state === 'completed') {
        entries.delete(eventId);
        return true;
      }
    }
    return false;
  };

  return Object.freeze({
    begin(eventId) {
      if (typeof eventId !== 'string' || eventId.length === 0) return false;
      const currentTime = now();
      prune(currentTime);
      if (entries.has(eventId)) return false;
      while (entries.size >= maxEntries) {
        if (!evictOldestCompleted()) return false;
      }
      entries.set(eventId, { state: 'processing', expiresAt: currentTime + ttlMs });
      return true;
    },

    complete(eventId) {
      const entry = entries.get(eventId);
      if (entry) entry.state = 'completed';
    },

    release(eventId) {
      entries.delete(eventId);
    },
  });
}
