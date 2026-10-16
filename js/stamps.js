// Pure stamp store. The only place that touches storage.
// Works with any { getItem, setItem } object, or null, and never throws.

export const STOP_IDS = ['pingpong', 'sudoku', 'doodle', 'sweets', 'badminton'];

function readIds(storage, key) {
  if (!storage) return [];
  try {
    const raw = storage.getItem(key);
    if (raw == null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(v => typeof v === 'string')) return [];
    return [...new Set(parsed)];
  } catch {
    return [];
  }
}

export function createStampStore(storage, key) {
  const ids = readIds(storage, key);
  const listeners = new Set();

  function save() {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify(ids));
    } catch {
      /* storage blocked or full: keep going in memory */
    }
  }

  return {
    award(id) {
      if (ids.includes(id)) return false;
      ids.push(id);
      save();
      const snapshot = [...ids];
      for (const fn of [...listeners]) {
        try { fn(snapshot, id); } catch (err) { setTimeout(() => { throw err; }); }
      }
      return true;
    },
    has: id => ids.includes(id),
    count: () => ids.length,
    list: () => [...ids],
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

// Returns window.localStorage when it is usable, otherwise null.
export function browserStorage() {
  try {
    const s = globalThis.window?.localStorage;
    if (!s) return null;
    s.getItem('sh024-probe');
    return s;
  } catch {
    return null;
  }
}
