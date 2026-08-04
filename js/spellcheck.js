// Human-friendly spelling check for typing-mode practice.
//
// Rules (as specified): case and apostrophes never matter. Beyond that,
// small typos are tolerated at roughly one edit per 4 letters of the
// correct word - a "close" answer still counts as correct (shown in
// yellow), so a single missed/extra/swapped letter in a 6-8 letter word
// doesn't fail you the way an exact-match check would.

export function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/\s+/g, " ");
}

/** Classic Levenshtein edit distance (insert/delete/substitute). */
export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/**
 * @returns {{verdict: "exact"|"close"|"wrong", distance: number}}
 * - exact: perfect match after lowercasing / trimming / stripping apostrophes
 * - close: within the allowed typo budget (floor(length / 4) edits) - counts as correct
 * - wrong: anything else
 */
export function checkSpelling(typed, correct) {
  const a = normalize(typed);
  const b = normalize(correct);

  if (!a) return { verdict: "wrong", distance: b.length };

  const distance = levenshtein(a, b);
  if (distance === 0) return { verdict: "exact", distance };

  const allowedTypos = Math.floor(b.length / 4);
  if (distance <= allowedTypos) return { verdict: "close", distance };

  return { verdict: "wrong", distance };
}
