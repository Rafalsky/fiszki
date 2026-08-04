// 5-box Leitner-style spaced repetition engine.
// Box 0 means "never reviewed yet" and is not persisted in storage —
// a word only gets a progress record once it has been graded at least once.
export const MAX_LEVEL = 5;

// Days until next review after a *correct* answer lands a word on this level.
export const INTERVAL_DAYS = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

export function createEmptyProgress() {
  return { level: 0, dueAt: null, reviews: 0, correctStreak: 0 };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Grade a word review and return the next progress state.
 * @param {{level:number, dueAt:string|null, reviews:number, correctStreak:number}|undefined} progress
 * @param {boolean} knew - whether the user recalled the word correctly
 * @param {Date} now
 */
export function gradeWord(progress, knew, now = new Date()) {
  const current = progress ?? createEmptyProgress();
  const newLevel = knew ? Math.min(current.level + 1, MAX_LEVEL) : 1;
  const dueAt = knew ? addDays(now, INTERVAL_DAYS[newLevel]).toISOString() : now.toISOString();

  return {
    level: newLevel,
    dueAt,
    reviews: current.reviews + 1,
    correctStreak: knew ? current.correctStreak + 1 : 0,
  };
}

export function isDue(progress, now = new Date()) {
  if (!progress || !progress.dueAt) return false;
  return new Date(progress.dueAt).getTime() <= now.getTime();
}

/** Word ids with an existing progress record that are due for review, ordered hardest-first. */
export function getDueWordIds(words, progressMap, now = new Date()) {
  return words
    .filter((w) => isDue(progressMap[w.id], now))
    .sort((a, b) => {
      const pa = progressMap[a.id];
      const pb = progressMap[b.id];
      if (pa.level !== pb.level) return pa.level - pb.level;
      return new Date(pa.dueAt) - new Date(pb.dueAt);
    })
    .map((w) => w.id);
}

/** Word ids never reviewed before, in frequency order (id ascending), capped to `limit`. */
export function getNewWordIds(words, progressMap, limit) {
  return words
    .filter((w) => !progressMap[w.id])
    .sort((a, b) => a.id - b.id)
    .slice(0, limit)
    .map((w) => w.id);
}

/** Fisher-Yates shuffle. Returns a new array; does not mutate the input. */
export function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function countByLevel(words, progressMap) {
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const w of words) {
    const level = progressMap[w.id]?.level ?? 0;
    counts[level] += 1;
  }
  return counts;
}
