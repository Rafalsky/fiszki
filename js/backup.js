// Manual export/import of all locally-stored progress as a JSON file.
// localStorage is scoped per-origin, so moving the app to a new domain
// leaves it behind entirely - this is the migration path: export before
// switching domains, import once on the new one.

import * as storage from "./storage.js";
import * as grammarStorage from "./grammarStorage.js";

const BACKUP_VERSION = "fiszki-backup-v1";

export function exportBackup() {
  return {
    appVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    vocabProgress: storage.loadProgress(),
    vocabSettings: storage.loadSettings(),
    grammarProgress: grammarStorage.loadGrammarProgress(),
  };
}

export function isValidBackup(data) {
  return Boolean(
    data &&
      typeof data === "object" &&
      (data.vocabProgress || data.vocabSettings || data.grammarProgress)
  );
}

export function importBackup(data) {
  if (data.vocabProgress) storage.saveProgress(data.vocabProgress);
  if (data.vocabSettings) storage.saveSettings(data.vocabSettings);
  if (data.grammarProgress) grammarStorage.saveGrammarProgress(data.grammarProgress);
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
