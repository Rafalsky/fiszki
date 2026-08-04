// Grammar mode: theory reference, SRS fill-in-the-blank drills (reusing
// srs.js + spellcheck.js as-is), and a scored multiple-choice quiz.
// Self-contained module: loads its own data and owns its own progress key,
// independent of the vocab `state` in app.js.

import { loadTenses, loadDrills } from "./grammarRepo.js";
import * as grammarStorage from "./grammarStorage.js";
import * as srs from "./srs.js";
import * as spellcheck from "./spellcheck.js";
import { el, switchView } from "./viewUtils.js";

const state = {
  tenses: [],
  tensesById: new Map(),
  drills: [],
  drillsById: new Map(),
  progress: grammarStorage.loadGrammarProgress(),
  drillSession: null, // { queue: [id,...], index, total, known, unknown }
  quiz: null, // { questions: [{drill, choices}], index, score }
};

// ---------- Tense theory ----------

function renderTensesList() {
  const sorted = [...state.tenses].sort((a, b) => a.order - b.order);
  el("tenses-list").innerHTML = sorted
    .map(
      (t) => `
      <button type="button" class="tense-item" data-tense-id="${t.id}">
        <span class="tense-item-name-pl">${t.namePl}</span>
        <span class="tense-item-name-en">${t.nameEn}</span>
      </button>`
    )
    .join("");
}

function renderTenseDetail(tenseId) {
  const t = state.tensesById.get(tenseId);
  if (!t) return;

  el("tense-detail-content").innerHTML = `
    <div class="tense-detail">
      <h2>${t.namePl}</h2>
      <p class="tense-detail-en">${t.nameEn}</p>

      <div class="tense-detail-section">
        <h3>Budowa zdania</h3>
        <div class="tense-formation-row"><span class="tense-formation-label">Twierdzenie</span><span>${t.formation.affirmative}</span></div>
        <div class="tense-formation-row"><span class="tense-formation-label">Przeczenie</span><span>${t.formation.negative}</span></div>
        <div class="tense-formation-row"><span class="tense-formation-label">Pytanie</span><span>${t.formation.question}</span></div>
      </div>

      <div class="tense-detail-section">
        <h3>Kiedy używamy</h3>
        <ul class="tense-usage-list">${t.usage.map((u) => `<li>${u}</li>`).join("")}</ul>
      </div>

      <div class="tense-detail-section">
        <h3>Słowa sygnałowe</h3>
        <div class="signal-words">${t.signalWords.map((w) => `<span class="signal-word-pill">${w}</span>`).join("")}</div>
      </div>

      <div class="tense-detail-section">
        <h3>Przykłady</h3>
        <div class="tense-examples-list">
          ${t.examples
            .map(
              (ex) => `
            <div class="tense-example">
              <p class="tense-example-en">${ex.en}</p>
              <p class="tense-example-pl">${ex.pl}</p>
            </div>`
            )
            .join("")}
        </div>
      </div>
    </div>`;
}

// ---------- Tense home: tab switching ----------

function switchTenseTab(tab) {
  document.querySelectorAll(".tense-view").forEach((v) => v.classList.remove("is-active"));
  el(`tense-view-${tab}`).classList.add("is-active");

  document.querySelectorAll('#view-grammar-tenses-home .subnav-btn').forEach((b) => b.classList.remove("is-active"));
  document.querySelector(`#view-grammar-tenses-home .subnav-btn[data-tense-tab="${tab}"]`).classList.add("is-active");

  if (tab === "drill") renderDrillDashboard();
}

// ---------- Drill dashboard ----------

function renderDrillDashboard() {
  const now = new Date();
  const dueIds = srs.getDueWordIds(state.drills, state.progress, now);
  const newIds = srs.getNewWordIds(state.drills, state.progress, 20);
  const counts = srs.countByLevel(state.drills, state.progress);
  const totalNew = state.drills.filter((d) => !state.progress[d.id]).length;

  el("grammar-stats-grid").innerHTML = `
    <div class="stat-card"><strong>${state.drills.length}</strong><span>Ćwiczeń łącznie</span></div>
    <div class="stat-card"><strong>${counts[5]}</strong><span>Opanowane</span></div>
    <div class="stat-card"><strong>${dueIds.length}</strong><span>Do powtórki dziś</span></div>
    <div class="stat-card"><strong>${totalNew}</strong><span>Jeszcze nietknięte</span></div>
  `;

  el("grammar-due-count").textContent = dueIds.length;
  el("grammar-new-count").textContent = newIds.length;
  el("btn-grammar-start-review").disabled = dueIds.length === 0;
  el("btn-grammar-start-new").disabled = newIds.length === 0;
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
  const tense = state.tensesById.get(drill.tenseId);

  el("grammar-flashcard-level").innerHTML = [1, 2, 3, 4, 5]
    .map((n) => `<span class="${n <= level ? "is-filled" : ""}"></span>`)
    .join("");

  const doneSoFar = session.index;
  el("grammar-drill-progress-label").textContent = `${doneSoFar} / ${session.total}`;
  el("grammar-drill-progress-bar").style.width = `${(doneSoFar / session.total) * 100}%`;

  el("grammar-tense-label").textContent = tense ? `${tense.namePl} (${tense.nameEn})` : "";
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
  switchView("grammar-tenses-home");
  switchTenseTab("drill");
}

// ---------- Quiz ----------

function buildQuizQuestions() {
  const drillsByTense = new Map();
  for (const d of state.drills) {
    if (!drillsByTense.has(d.tenseId)) drillsByTense.set(d.tenseId, []);
    drillsByTense.get(d.tenseId).push(d);
  }

  const sortedTenses = [...state.tenses].sort((a, b) => a.order - b.order);
  const questions = sortedTenses.map((t) => {
    const pool = drillsByTense.get(t.id) || [];
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
  const tense = state.tensesById.get(drill.tenseId);

  el("quiz-progress-label").textContent = `${quiz.index} / ${quiz.questions.length}`;
  el("quiz-progress-bar").style.width = `${(quiz.index / quiz.questions.length) * 100}%`;

  el("quiz-tense-label").textContent = tense ? `${tense.namePl} (${tense.nameEn})` : "";
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
  el("quiz-score-text").textContent = quiz
    ? `Wynik: ${quiz.score} / ${quiz.questions.length}`
    : "";
  state.quiz = null;
  switchView("quiz-results");
}

function exitQuiz() {
  state.quiz = null;
  switchView("grammar-tenses-home");
  switchTenseTab("quiz");
}

// ---------- Wiring ----------

function wireTopicNav() {
  el("btn-topic-tenses").addEventListener("click", () => {
    switchView("grammar-tenses-home");
    switchTenseTab("theory");
  });

  el("btn-grammar-tenses-back").addEventListener("click", () => switchView("grammar-topics"));
  el("btn-tense-detail-back").addEventListener("click", () => switchView("grammar-tenses-home"));

  document.querySelectorAll('#view-grammar-tenses-home .subnav-btn[data-tense-tab]').forEach((btn) => {
    btn.addEventListener("click", () => switchTenseTab(btn.dataset.tenseTab));
  });

  el("tenses-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".tense-item");
    if (!btn) return;
    renderTenseDetail(btn.dataset.tenseId);
    switchView("tense-detail");
  });
}

function wireDrill() {
  el("btn-grammar-start-review").addEventListener("click", () => startDrillSession("review"));
  el("btn-grammar-start-new").addEventListener("click", () => startDrillSession("new"));
  el("btn-exit-grammar-drill").addEventListener("click", exitDrillSession);
  el("btn-grammar-summary-done").addEventListener("click", () => {
    switchView("grammar-tenses-home");
    switchTenseTab("drill");
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
    switchView("grammar-tenses-home");
    switchTenseTab("quiz");
  });

  el("quiz-choices").addEventListener("click", (e) => {
    const btn = e.target.closest(".quiz-choice-btn");
    if (!btn || btn.disabled) return;
    submitQuizAnswer(decodeURIComponent(btn.dataset.choice), btn);
  });
}

function wireSettings() {
  el("btn-reset-grammar-progress").addEventListener("click", () => {
    if (confirm("Na pewno wyzerować cały postęp ćwiczeń gramatycznych? Tej operacji nie można cofnąć.")) {
      grammarStorage.resetGrammarProgress();
      state.progress = {};
      renderDrillDashboard();
      alert("Postęp gramatyki został wyzerowany.");
    }
  });
}

export async function initGrammar() {
  const [tenses, drills] = await Promise.all([loadTenses(), loadDrills()]);
  state.tenses = tenses;
  state.tensesById = new Map(tenses.map((t) => [t.id, t]));
  state.drills = drills;
  state.drillsById = new Map(drills.map((d) => [d.id, d]));

  renderTensesList();
  wireTopicNav();
  wireDrill();
  wireQuiz();
  wireSettings();
}
