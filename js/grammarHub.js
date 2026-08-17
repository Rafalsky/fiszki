// Grammar hub: lists every topic as a card linking to its own page
// (grammar/<id>/), with a lightweight mastered/total readout per topic
// computed entirely from localStorage - no drills JSON is fetched here, so
// this page stays cheap no matter how many topics exist. `drillCount` (each
// topic's total number of drills) lives in grammarTopics.json precisely so
// this progress readout doesn't need to fetch every topic's drills file.
//
// Topics are grouped into CEFR level tabs (A1-C2) via each topic's `level`
// field in grammarTopics.json. The tab that opens by default starts at A1
// and advances to the next level once every topic in the current level (and
// all levels before it) is over 50% mastered - so a learner who's cleared
// A1 lands straight on A2 next time, and so on up to C2.

import { loadTopics } from "./grammarRepo.js";
import * as grammarStorage from "./grammarStorage.js";

const LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2"];
const LEVEL_LABELS = { a1: "A1", a2: "A2", b1: "B1", b2: "B2", c1: "C1", c2: "C2" };

function masteredCount(progress, topicId) {
  let n = 0;
  const prefix = `${topicId}:`;
  for (const key in progress) {
    if (key.startsWith(prefix) && progress[key]?.level === 5) n += 1;
  }
  return n;
}

function isLevelMastered(topics, progress, level) {
  const levelTopics = topics.filter((t) => t.level === level);
  if (levelTopics.length === 0) return true;
  return levelTopics.every((t) => typeof t.drillCount === "number" && t.drillCount > 0 && masteredCount(progress, t.id) / t.drillCount > 0.5);
}

// Default tab: A1, advancing one level at a time for as long as every
// preceding level is more than half-mastered.
function computeDefaultLevel(topics, progress) {
  let defaultLevel = LEVELS[0];
  for (let i = 0; i < LEVELS.length - 1; i++) {
    if (!isLevelMastered(topics, progress, LEVELS[i])) break;
    defaultLevel = LEVELS[i + 1];
  }
  return defaultLevel;
}

function renderLevelTabs(topics, activeLevel, onSelect) {
  const levelsPresent = LEVELS.filter((lvl) => topics.some((t) => t.level === lvl));
  document.getElementById("level-tabs").innerHTML = levelsPresent
    .map((lvl) => `<button type="button" data-level="${lvl}" class="subnav-btn${lvl === activeLevel ? " is-active" : ""}">${LEVEL_LABELS[lvl]}</button>`)
    .join("");

  document.getElementById("level-tabs").querySelectorAll("[data-level]").forEach((btn) => {
    btn.addEventListener("click", () => onSelect(btn.dataset.level));
  });
}

function renderTopicsGrid(topics, activeLevel) {
  const progress = grammarStorage.loadGrammarProgress();

  document.getElementById("topics-grid").innerHTML = topics
    .filter((t) => t.level === activeLevel)
    .map((t) => {
      const progressLabel =
        typeof t.drillCount === "number" ? `<span class="topic-card-progress">${masteredCount(progress, t.id)} / ${t.drillCount} opanowane</span>` : "";
      return `
      <a href="./${t.id}/" class="topic-card">
        <span class="topic-card-icon">${t.icon}</span>
        <span class="topic-card-title">${t.title}</span>
        <span class="topic-card-desc">${t.desc}</span>
        ${progressLabel}
      </a>`;
    })
    .join("");
}

function render(topics, activeLevel) {
  renderLevelTabs(topics, activeLevel, (level) => render(topics, level));
  renderTopicsGrid(topics, activeLevel);
}

async function init() {
  const topics = await loadTopics();
  const progress = grammarStorage.loadGrammarProgress();
  render(topics, computeDefaultLevel(topics, progress));
}

init().catch((err) => {
  console.error(err);
  document.getElementById("topics-grid").innerHTML = `<p style="color:#d64550;">Nie udało się wczytać listy tematów: ${err.message}</p>`;
});
