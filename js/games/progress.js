// Pure win/skip bookkeeping for the canvas games.

export function createProgress({ goal, skipAfter }) {
  let hits = 0;
  let misses = 0;
  return {
    hit() {
      if (hits < goal) hits += 1;
      return hits;
    },
    miss() {
      if (hits < goal) misses += 1;
      return misses;
    },
    reset() {
      hits = 0;
      misses = 0;
    },
    get hits() { return hits; },
    get misses() { return misses; },
    get won() { return hits >= goal; },
    get canSkip() { return hits < goal && misses >= skipAfter; },
  };
}
