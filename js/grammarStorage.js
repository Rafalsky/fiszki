// Separate localStorage deck for grammar drills - a different kind of
// content than vocabulary words, so it gets its own progress key rather
// than sharing fiszki.progress.v1.
const PROGRESS_KEY = "fiszki.grammarProgress.v1";

export function loadGrammarProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveGrammarProgress(progressMap) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressMap));
}

export function resetGrammarProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}
