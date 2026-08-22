// Single grammar topic page: theory reference cards, SRS fill-in-the-blank
// drills (reusing srs.js + spellcheck.js as-is), and a scored multiple-choice
// quiz — all for the one topic named in `<body data-topic-id>`.
//
// Each topic lives at its own path (grammar/<id>/index.html) instead of
// being one more view crammed into the main app shell, so the vocab page
// never has to load grammar markup/JS it doesn't need, and adding a topic
// never grows the page every visitor downloads. Adding a topic needs a
// theory JSON file, a drills JSON file, an entry in grammarTopics.json, two
// lines in grammarRepo.js, and a copy of grammar/_template/index.html with
// the id/title/icon filled in - no changes to this file.

import { loadTopics, loadTopicTheory, loadTopicDrills } from "./grammarRepo.js";
import * as grammarStorage from "./grammarStorage.js";
import * as srs from "./srs.js";
import { initFirebase, queueGrammarSync } from "./firebase-auth-sync.js";
import * as spellcheck from "./spellcheck.js";
import { el, switchView } from "./viewUtils.js";

const topicId = document.body.dataset.topicId;

const state = {
  topic: null,
  items: [],
  itemsById: new Map(),
  drills: [],
  drillsById: new Map(),
  progress: grammarStorage.loadGrammarProgress(),
  drillSession: null, // { queue: [id,...], index, total, known, unknown }
  quiz: null, // { questions: [{drill, choices}], index, score }
};

// ---------- Theory ----------

function renderItemsList() {
  const sorted = [...state.items].sort((a, b) => a.order - b.order);
  el("topic-items-list").innerHTML = sorted
    .map(
      (it) => `
      <button type="button" class="topic-item-row" data-item-id="${it.id}">
        <span class="topic-item-name-pl">${it.namePl}</span>
        <span class="topic-item-name-en">${it.nameEn}</span>
      </button>`
    )
    .join("");
}

function renderItemDetail(itemId) {
  const item = state.itemsById.get(itemId);
  if (!item) return;

  const rulesHtml = item.rules
    .map((r) => `<div class="topic-rule-row"><span class="topic-rule-label">${r.label}</span><span>${r.text}</span></div>`)
    .join("");

  const tagsHtml =
    item.tags && item.tags.length
      ? `
      <div class="topic-detail-section">
        <h3>Kluczowe przykłady</h3>
        <div class="topic-tags">${item.tags.map((w) => `<span class="topic-tag-pill">${w}</span>`).join("")}</div>
      </div>`
      : "";

  el("topic-item-detail-content").innerHTML = `
    <div class="topic-item-detail">
      <h2>${item.namePl}</h2>
      <p class="topic-item-detail-en">${item.nameEn}</p>

      <div class="topic-detail-section">
        <h3>Zasady</h3>
        ${rulesHtml}
      </div>

      <div class="topic-detail-section">
        <h3>Kiedy używamy</h3>
        <ul class="topic-usage-list">${item.usage.map((u) => `<li>${u}</li>`).join("")}</ul>
      </div>
      ${tagsHtml}
      <div class="topic-detail-section">
        <h3>Przykłady</h3>
        <div class="topic-examples-list">
          ${item.examples
            .map(
              (ex) => `
            <div class="topic-example">
              <p class="topic-example-en">${ex.en}</p>
              <p class="topic-example-pl">${ex.pl}</p>
            </div>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
}

// ---------- Topic home: tab switching ----------

function switchTopicTab(tab) {
  document.querySelectorAll(".topic-view").forEach((v) => v.classList.remove("is-active"));
  el(`topic-view-${tab}`).classList.add("is-active");

  document.querySelectorAll("#view-topic-home .subnav-btn").forEach((b) => b.classList.remove("is-active"));
  document.querySelector(`#view-topic-home .subnav-btn[data-topic-tab="${tab}"]`).classList.add("is-active");

  if (tab === "drill") renderDrillDashboard();
}

// ---------- Drill dashboard ----------

function renderDrillDashboard() {
  const now = new Date();
  const dueIds = srs.getDueWordIds(state.drills, state.progress, now);
  const newIds = srs.getNewWordIds(state.drills, state.progress, 20);
  const counts = srs.countByLevel(state.drills, state.progress);
  const totalNew = state.drills.filter((d) => !state.progress[d.id]).length;

  el("topic-stats-grid").innerHTML = `
    <div class="stat-card"><strong>${state.drills.length}</strong><span>Ćwiczeń łącznie</span></div>
    <div class="stat-card"><strong>${counts[5]}</strong><span>Opanowane</span></div>
    <div class="stat-card"><strong>${dueIds.length}</strong><span>Do powtórki dziś</span></div>
    <div class="stat-card"><strong>${totalNew}</strong><span>Jeszcze nietknięte</span></div>
  `;

  el("topic-due-count").textContent = dueIds.length;
  el("topic-new-count").textContent = newIds.length;
  el("btn-topic-start-review").disabled = dueIds.length === 0;
  el("btn-topic-start-new").disabled = newIds.length === 0;
}

// ---------- Drill session ----------

function startDrillSession(mode) {
  const now = new Date();
  const ordered =
    mode === "review"
      ? srs.getDueWordIds(state.drills, state.progress, now)
      : srs.getNewWordIds(state.drills, state.progress, 20);

  if (ordered.length === 0) return;

  const queue = srs.shuffle(ordered);
  state.drillSession = { queue, total: queue.length, index: 0, known: 0, unknown: 0 };

  switchView("grammar-drill");
  renderDrillCard();
}

function currentDrill() {
  const id = state.drillSession.queue[state.drillSession.index];
  return state.drillsById.get(id);
}

function renderDrillCard() {
  const session = state.drillSession;
  if (!session || session.index >= session.queue.length) {
    finishDrillSession();
    return;
  }

  const drill = currentDrill();
  const level = state.progress[drill.id]?.level ?? 0;
  const item = state.itemsById.get(drill.itemId);

  el("grammar-flashcard-level").innerHTML = [1, 2, 3, 4, 5]
    .map((n) => `<span class="${n <= level ? "is-filled" : ""}"></span>`)
    .join("");

  const doneSoFar = session.index;
  el("grammar-drill-progress-label").textContent = `${doneSoFar} / ${session.total}`;
  el("grammar-drill-progress-bar").style.width = `${(doneSoFar / session.total) * 100}%`;

  el("grammar-item-label").textContent = item ? `${item.namePl} (${item.nameEn})` : "";
  el("grammar-prompt").textContent = drill.prompt;

  el("grammar-front").classList.remove("is-hidden");
  el("grammar-result").classList.add("is-hidden");
  el("grammar-controls-input").classList.remove("is-hidden");
  el("grammar-controls-next").classList.add("is-hidden");

  const input = el("grammar-typing-input");
  input.value = "";
  input.disabled = false;
  setTimeout(() => input.focus(), 50);
}

const DRILL_VERDICT_LABELS = {
  exact: "✓ Świetnie, idealnie!",
  close: "≈ Prawie — drobna literówka, ale zaliczone",
  wrong: "✗ Nie tym razem",
};

function submitDrillAnswer() {
  const session = state.drillSession;
  const drill = currentDrill();
  const typed = el("grammar-typing-input").value;
  const result = spellcheck.checkSpelling(typed, drill.answer);
  const knew = result.verdict !== "wrong";

  state.progress[drill.id] = srs.gradeWord(state.progress[drill.id], knew, new Date());
  grammarStorage.saveGrammarProgress(state.progress);
  queueGrammarSync(drill.id, state.progress[drill.id]);

  if (knew) {
    session.known += 1;
  } else {
    session.unknown += 1;
    const reinsertAt = Math.min(session.index + 4, session.queue.length);
    session.queue.splice(reinsertAt, 0, drill.id);
    session.total = session.queue.length;
  }

  el("grammar-typing-input").disabled = true;
  el("grammar-controls-input").classList.add("is-hidden");
  el("grammar-controls-next").classList.remove("is-hidden");

  el("grammar-front").classList.add("is-hidden");
  el("grammar-result").classList.remove("is-hidden");

  const verdictEl = el("grammar-verdict");
  verdictEl.textContent = DRILL_VERDICT_LABELS[result.verdict];
  verdictEl.className = `typing-verdict typing-verdict-${result.verdict}`;

  el("grammar-result-answer").textContent = drill.answer;
  const trimmed = typed.trim();
  el("grammar-you-typed").textContent = trimmed ? `Wpisano: "${trimmed}"` : "Nie wpisano nic";

  el("btn-grammar-next").focus();
}

function advanceDrillSession() {
  state.drillSession.index += 1;
  renderDrillCard();
}

function finishDrillSession() {
  const session = state.drillSession;
  el("grammar-summary-text").textContent = session
    ? `Poprawnie: ${session.known} · Do powtórzenia: ${session.unknown}`
    : "";
  state.drillSession = null;
  switchView("grammar-drill-summary");
}

function exitDrillSession() {
  state.drillSession = null;
  switchView("topic-home");
  switchTopicTab("drill");
}

// ---------- Quiz ----------

function buildQuizQuestions() {
  const drillsByItem = new Map();
  for (const d of state.drills) {
    if (!drillsByItem.has(d.itemId)) drillsByItem.set(d.itemId, []);
    drillsByItem.get(d.itemId).push(d);
  }

  const sortedItems = [...state.items].sort((a, b) => a.order - b.order);
  const questions = sortedItems.map((it) => {
    const pool = drillsByItem.get(it.id) || [];
    const drill = pool[Math.floor(Math.random() * pool.length)];
    const choices = srs.shuffle([drill.answer, ...drill.distractors]);
    return { drill, choices };
  });

  return srs.shuffle(questions);
}

function startQuiz() {
  state.quiz = { questions: buildQuizQuestions(), index: 0, score: 0 };
  switchView("quiz-session");
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const quiz = state.quiz;
  if (!quiz || quiz.index >= quiz.questions.length) {
    finishQuiz();
    return;
  }

  const { drill, choices } = quiz.questions[quiz.index];
  const item = state.itemsById.get(drill.itemId);

  el("quiz-progress-label").textContent = `${quiz.index} / ${quiz.questions.length}`;
  el("quiz-progress-bar").style.width = `${(quiz.index / quiz.questions.length) * 100}%`;

  el("quiz-item-label").textContent = item ? `${item.namePl} (${item.nameEn})` : "";
  el("quiz-prompt").textContent = drill.prompt;

  el("quiz-choices").innerHTML = choices
    .map((c) => `<button type="button" class="quiz-choice-btn" data-choice="${encodeURIComponent(c)}">${c}</button>`)
    .join("");
}

function submitQuizAnswer(chosen, btn) {
  const quiz = state.quiz;
  const { drill } = quiz.questions[quiz.index];
  const correct = chosen === drill.answer;
  if (correct) quiz.score += 1;

  document.querySelectorAll("#quiz-choices .quiz-choice-btn").forEach((b) => {
    b.disabled = true;
    const value = decodeURIComponent(b.dataset.choice);
    if (value === drill.answer) b.classList.add("quiz-choice-correct");
    else if (b === btn) b.classList.add("quiz-choice-wrong");
  });

  setTimeout(() => {
    quiz.index += 1;
    renderQuizQuestion();
  }, 900);
}

function finishQuiz() {
  const quiz = state.quiz;
  el("quiz-score-text").textContent = quiz ? `Wynik: ${quiz.score} / ${quiz.questions.length}` : "";
  state.quiz = null;
  switchView("quiz-results");
}

function exitQuiz() {
  state.quiz = null;
  switchView("topic-home");
  switchTopicTab("quiz");
}

// ---------- Wiring ----------

function wireTopicHome() {
  el("btn-item-detail-back").addEventListener("click", () => switchView("topic-home"));

  document.querySelectorAll("#view-topic-home .subnav-btn[data-topic-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchTopicTab(btn.dataset.topicTab));
  });

  el("topic-items-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".topic-item-row");
    if (!btn) return;
    renderItemDetail(btn.dataset.itemId);
    switchView("item-detail");
  });
}

function wireDrill() {
  el("btn-topic-start-review").addEventListener("click", () => startDrillSession("review"));
  el("btn-topic-start-new").addEventListener("click", () => startDrillSession("new"));
  el("btn-exit-grammar-drill").addEventListener("click", exitDrillSession);
  el("btn-grammar-summary-done").addEventListener("click", () => {
    switchView("topic-home");
    switchTopicTab("drill");
  });

  el("grammar-typing-form").addEventListener("submit", (e) => {
    e.preventDefault();
    submitDrillAnswer();
  });
  el("btn-grammar-next").addEventListener("click", advanceDrillSession);
}

function wireQuiz() {
  el("btn-quiz-start").addEventListener("click", startQuiz);
  el("btn-exit-quiz").addEventListener("click", exitQuiz);
  el("btn-quiz-again").addEventListener("click", startQuiz);
  el("btn-quiz-done").addEventListener("click", () => {
    switchView("topic-home");
    switchTopicTab("quiz");
  });

  el("quiz-choices").addEventListener("click", (e) => {
    const btn = e.target.closest(".quiz-choice-btn");
    if (!btn || btn.disabled) return;
    submitQuizAnswer(decodeURIComponent(btn.dataset.choice), btn);
  });
}

function wireSettings() {
  const btn = el("btn-reset-grammar-progress");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (confirm("Na pewno wyzerować cały postęp ćwiczeń gramatycznych (wszystkie tematy)? Tej operacji nie można cofnąć.")) {
      grammarStorage.resetGrammarProgress();
      state.progress = {};
      renderDrillDashboard();
      alert("Postęp gramatyki został wyzerowany.");
    }
  });
}

async function init() {
  initFirebase();
  const [topics, items, rawDrills] = await Promise.all([
    loadTopics(),
    loadTopicTheory(topicId),
    loadTopicDrills(topicId),
  ]);

  state.topic = topics.find((t) => t.id === topicId) ?? null;
  state.items = items;
  state.itemsById = new Map(items.map((it) => [it.id, it]));
  state.drills = rawDrills.map((d) => ({ ...d, id: `${topicId}:${d.id}` }));
  state.drillsById = new Map(state.drills.map((d) => [d.id, d]));

  if (state.topic) document.title = `${state.topic.title} — Gramatyka — Fiszki`;

  el("topic-quiz-hint").textContent =
    `${items.length} pytań wielokrotnego wyboru — po jednym losowym z każdego elementu tego tematu. ` +
    `Wynik nie wpływa na poziomy powtórek, to tylko sprawdzian.`;

  renderItemsList();
  wireTopicHome();
  wireDrill();
  wireQuiz();
  wireSettings();
}

init().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<p style="padding:40px;text-align:center;color:#d64550;">Nie udało się wczytać tematu: ${err.message}</p>`;
});
