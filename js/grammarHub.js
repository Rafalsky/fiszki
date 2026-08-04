// Grammar hub: lists every topic as a card linking to its own page
// (grammar/<id>/), with a lightweight mastered/total readout per topic
// computed entirely from localStorage - no drills JSON is fetched here, so
// this page stays cheap no matter how many topics exist. `drillCount` (each
// topic's total number of drills) lives in grammarTopics.json precisely so
// this progress readout doesn't need to fetch every topic's drills file.

import { loadTopics } from "./grammarRepo.js";
import * as grammarStorage from "./grammarStorage.js";

function masteredCount(progress, topicId) {
  let n = 0;
  const prefix = `${topicId}:`;
  for (const key in progress) {
    if (key.startsWith(prefix) && progress[key]?.level === 5) n += 1;
  }
  return n;
}

function renderTopicsGrid(topics) {
  const progress = grammarStorage.loadGrammarProgress();

  document.getElementById("topics-grid").innerHTML = topics
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

async function init() {
  const topics = await loadTopics();
  renderTopicsGrid(topics);
}

init().catch((err) => {
  console.error(err);
  document.getElementById("topics-grid").innerHTML = `<p style="color:#d64550;">Nie udało się wczytać listy tematów: ${err.message}</p>`;
});
