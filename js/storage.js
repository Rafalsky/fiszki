const PROGRESS_KEY = "fiszki.progress.v1";
const SETTINGS_KEY = "fiszki.settings.v1";

const DEFAULT_SETTINGS = {
  voiceURI: "",
  rate: 1,
  autoplay: true,
  newPerSession: 20,
};

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveProgress(progressMap) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressMap));
}

export function resetProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
