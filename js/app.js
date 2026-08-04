import { loadWords } from "./wordsRepo.js";
import * as storage from "./storage.js";
import * as srs from "./srs.js";
import * as speech from "./speech.js";
import * as spellcheck from "./spellcheck.js";

const LEVEL_COLORS = {
  0: "#9aa0b0",
  1: "var(--box-1)",
  2: "var(--box-2)",
  3: "var(--box-3)",
  4: "var(--box-4)",
  5: "var(--box-5)",
};

const LEVEL_LABELS = {
  0: "Nowe",
  1: "Poziom 1 — dopiero poznane",
  2: "Poziom 2",
  3: "Poziom 3",
  4: "Poziom 4",
  5: "Poziom 5 — opanowane",
};

const state = {
  words: [],
  wordsById: new Map(),
  progress: storage.loadProgress(),
  settings: storage.loadSettings(),
  session: null, // { queue: [id,...], index, mode, results: {known, unknown} }
};

const el = (id) => document.getElementById(id);

function switchView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
  el(`view-${name}`).classList.add("is-active");
  const navBtn = document.querySelector(`.nav-btn[data-view="${name}"]`);
  if (navBtn) navBtn.classList.add("is-active");
}

// ---------- Dashboard ----------

function renderDashboard() {
  const now = new Date();
  const counts = srs.countByLevel(state.words, state.progress);
  const dueIds = srs.getDueWordIds(state.words, state.progress, now);
  const newIds = srs.getNewWordIds(state.words, state.progress, state.settings.newPerSession);
  const totalNew = state.words.filter((w) => !state.progress[w.id]).length;

  el("stats-grid").innerHTML = `
    <div class="stat-card"><strong>${state.words.length}</strong><span>Słówek łącznie</span></div>
    <div class="stat-card"><strong>${counts[5]}</strong><span>Opanowane</span></div>
    <div class="stat-card"><strong>${dueIds.length}</strong><span>Do powtórki dziś</span></div>
    <div class="stat-card"><strong>${totalNew}</strong><span>Jeszcze nietknięte</span></div>
  `;

  el("boxes-list").innerHTML = [1, 2, 3, 4, 5]
    .map(
      (level) => `
      <li class="box-row">
        <span class="box-dot" style="background:${LEVEL_COLORS[level]}"></span>
        <span class="box-label">${LEVEL_LABELS[level]}</span>
        <span class="box-count">${counts[level]}</span>
      </li>`
    )
    .join("");

  el("due-count").textContent = dueIds.length;
  el("new-count").textContent = newIds.length;
  el("btn-start-review").disabled = dueIds.length === 0;
  el("btn-start-new").disabled = newIds.length === 0;
}

// ---------- Study session ----------

function startSession(mode) {
  const now = new Date();
  const ordered =
    mode === "review"
      ? srs.getDueWordIds(state.words, state.progress, now)
      : srs.getNewWordIds(state.words, state.progress, state.settings.newPerSession);

  if (ordered.length === 0) return;

  // Shuffle so each session presents cards in a different order, instead of
  // always the same frequency-rank / due-priority sequence.
  const queue = srs.shuffle(ordered);

  state.session = {
    mode,
    queue,
    total: queue.length,
    index: 0,
    known: 0,
    unknown: 0,
  };

  switchView("study");
  renderCard();
}

function currentWord() {
  const id = state.session.queue[state.session.index];
  return state.wordsById.get(id);
}

function renderCard() {
  const session = state.session;
  if (!session || session.index >= session.queue.length) {
    finishSession();
    return;
  }

  const word = currentWord();
  const level = state.progress[word.id]?.level ?? 0;

  el("flashcard-level").innerHTML = [1, 2, 3, 4, 5]
    .map((n) => `<span class="${n <= level ? "is-filled" : ""}"></span>`)
    .join("");

  const doneSoFar = session.index;
  el("study-progress-label").textContent = `${doneSoFar} / ${session.total}`;
  el("study-progress-bar").style.width = `${(doneSoFar / session.total) * 100}%`;

  if (state.settings.practiceMode === "typing") {
    renderTypingFront(word);
  } else {
    renderGradingFront(word);
  }

  if (state.settings.autoplay) {
    speech.speak(word.en, state.settings);
  }
}

function renderGradingFront(word) {
  el("word-en").textContent = word.en;
  el("word-pl").textContent = word.pl;

  el("flashcard-front-grading").classList.remove("is-hidden");
  el("flashcard-front-typing").classList.add("is-hidden");
  el("flashcard-back").classList.add("is-hidden");
  el("flashcard-typing-result").classList.add("is-hidden");

  el("study-controls-grading").classList.remove("is-hidden");
  el("study-controls-typing").classList.add("is-hidden");
  el("btn-reveal").classList.remove("is-hidden");
  el("grade-buttons").classList.add("is-hidden");
}

function renderTypingFront(word) {
  el("word-pl-prompt").textContent = word.pl;

  el("flashcard-front-typing").classList.remove("is-hidden");
  el("flashcard-front-grading").classList.add("is-hidden");
  el("flashcard-back").classList.add("is-hidden");
  el("flashcard-typing-result").classList.add("is-hidden");

  el("study-controls-typing").classList.remove("is-hidden");
  el("study-controls-grading").classList.add("is-hidden");
  el("typing-form").classList.remove("is-hidden");
  el("btn-typing-next").classList.add("is-hidden");

  const input = el("typing-input");
  input.value = "";
  input.disabled = false;
  setTimeout(() => input.focus(), 50);
}

function revealAnswer() {
  el("flashcard-back").classList.remove("is-hidden");
  el("btn-reveal").classList.add("is-hidden");
  el("grade-buttons").classList.remove("is-hidden");
}

/** Update SRS progress + session tallies for the current word. Does not advance the session. */
function applyGrade(knew) {
  const session = state.session;
  const word = currentWord();
  const now = new Date();

  state.progress[word.id] = srs.gradeWord(state.progress[word.id], knew, now);
  storage.saveProgress(state.progress);

  if (knew) {
    session.known += 1;
  } else {
    session.unknown += 1;
    // Reinforce within the same session: show it again in a few cards.
    const reinsertAt = Math.min(session.index + 4, session.queue.length);
    session.queue.splice(reinsertAt, 0, word.id);
    session.total = session.queue.length;
  }
}

function advanceSession() {
  state.session.index += 1;
  renderCard();
}

function gradeCurrentWord(knew) {
  applyGrade(knew);
  advanceSession();
}

const TYPING_VERDICT_LABELS = {
  exact: "✓ Świetnie, idealnie!",
  close: "≈ Prawie — drobna literówka, ale zaliczone",
  wrong: "✗ Nie tym razem",
};

function submitTypingAnswer() {
  const word = currentWord();
  const typed = el("typing-input").value;
  const result = spellcheck.checkSpelling(typed, word.en);

  applyGrade(result.verdict !== "wrong");

  el("typing-input").disabled = true;
  el("typing-form").classList.add("is-hidden");
  el("btn-typing-next").classList.remove("is-hidden");

  el("flashcard-front-typing").classList.add("is-hidden");
  el("flashcard-typing-result").classList.remove("is-hidden");

  const verdictEl = el("typing-verdict");
  verdictEl.textContent = TYPING_VERDICT_LABELS[result.verdict];
  verdictEl.className = `typing-verdict typing-verdict-${result.verdict}`;

  el("typing-result-word").textContent = word.en;
  const trimmed = typed.trim();
  el("typing-you-typed").textContent = trimmed ? `Wpisano: "${trimmed}"` : "Nie wpisano nic";

  if (result.verdict !== "exact") {
    speech.speak(word.en, state.settings);
  }

  el("btn-typing-next").focus();
}

function finishSession() {
  const session = state.session;
  el("summary-text").textContent = session
    ? `Poprawnie: ${session.known} · Do powtórzenia: ${session.unknown}`
    : "";
  state.session = null;
  switchView("summary");
  renderDashboard();
}

function exitSession() {
  state.session = null;
  switchView("dashboard");
  renderDashboard();
}

// ---------- Browse ----------

function renderBrowse(filter = "") {
  const q = filter.trim().toLowerCase();
  const rows = state.words
    .filter((w) => !q || w.en.toLowerCase().includes(q) || w.pl.toLowerCase().includes(q))
    .map((w) => {
      const level = state.progress[w.id]?.level ?? 0;
      return `
        <tr>
          <td>${w.id}</td>
          <td>${w.en}</td>
          <td><button type="button" class="row-speak-btn" data-word="${w.en}" aria-label="Odtwórz ${w.en}">🔊</button></td>
          <td>${w.pl}</td>
          <td><span class="level-pill" style="background:${LEVEL_COLORS[level]}">${level === 0 ? "nowe" : level}</span></td>
        </tr>`;
    })
    .join("");

  el("browse-tbody").innerHTML = rows || `<tr><td colspan="5">Brak wyników.</td></tr>`;
}

// ---------- Settings ----------

async function renderVoiceOptions() {
  if (!speech.isSupported()) {
    el("voice-hint").textContent =
      "Ta przeglądarka nie obsługuje Web Speech API — funkcja wymowy będzie niedostępna.";
    el("setting-voice").disabled = true;
    return;
  }

  const voices = speech.getEnglishVoices(await speech.getVoices());
  const select = el("setting-voice");

  if (voices.length === 0) {
    select.innerHTML = `<option value="">Domyślny głos systemowy</option>`;
    el("voice-hint").textContent =
      "Nie znaleziono angielskich głosów w tym systemie — zostanie użyty głos domyślny.";
    return;
  }

  select.innerHTML = voices
    .map((v) => `<option value="${v.voiceURI}">${v.name} (${v.lang})</option>`)
    .join("");
  select.value = state.settings.voiceURI || voices[0].voiceURI;
  if (!state.settings.voiceURI) {
    state.settings.voiceURI = voices[0].voiceURI;
    storage.saveSettings(state.settings);
  }
  el("voice-hint").textContent = `Dostępnych głosów angielskich: ${voices.length}.`;
}

function applySettingsToForm() {
  el("setting-rate").value = state.settings.rate;
  el("setting-rate-value").textContent = state.settings.rate.toFixed(1);
  el("setting-autoplay").checked = state.settings.autoplay;
  el("setting-new-per-session").value = state.settings.newPerSession;
  el("setting-practice-mode").value = state.settings.practiceMode;
}

function wireSettingsForm() {
  el("setting-voice").addEventListener("change", (e) => {
    state.settings.voiceURI = e.target.value;
    storage.saveSettings(state.settings);
  });

  el("setting-rate").addEventListener("input", (e) => {
    state.settings.rate = parseFloat(e.target.value);
    el("setting-rate-value").textContent = state.settings.rate.toFixed(1);
    storage.saveSettings(state.settings);
  });

  el("setting-autoplay").addEventListener("change", (e) => {
    state.settings.autoplay = e.target.checked;
    storage.saveSettings(state.settings);
  });

  el("setting-new-per-session").addEventListener("change", (e) => {
    const value = Math.max(5, Math.min(100, parseInt(e.target.value, 10) || 20));
    state.settings.newPerSession = value;
    e.target.value = value;
    storage.saveSettings(state.settings);
    renderDashboard();
  });

  el("setting-practice-mode").addEventListener("change", (e) => {
    state.settings.practiceMode = e.target.value;
    storage.saveSettings(state.settings);
  });

  el("btn-test-voice").addEventListener("click", () => {
    speech.speak("Hello! This is how I sound.", state.settings);
  });

  el("btn-reset-progress").addEventListener("click", () => {
    if (confirm("Na pewno wyzerować cały postęp nauki? Tej operacji nie można cofnąć.")) {
      storage.resetProgress();
      state.progress = {};
      renderDashboard();
      renderBrowse(el("browse-search").value);
      alert("Postęp został wyzerowany.");
    }
  });
}

// ---------- Wiring ----------

function wireNav() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      switchView(view);
      if (view === "browse") renderBrowse(el("browse-search").value);
      if (view === "dashboard") renderDashboard();
    });
  });
}

function wireStudy() {
  el("btn-start-review").addEventListener("click", () => startSession("review"));
  el("btn-start-new").addEventListener("click", () => startSession("new"));
  el("btn-exit-study").addEventListener("click", exitSession);
  el("btn-reveal").addEventListener("click", revealAnswer);
  el("btn-speak").addEventListener("click", () => {
    const word = currentWord();
    if (word) speech.speak(word.en, state.settings);
  });
  el("btn-grade-no").addEventListener("click", () => gradeCurrentWord(false));
  el("btn-grade-yes").addEventListener("click", () => gradeCurrentWord(true));
  el("btn-summary-done").addEventListener("click", () => switchView("dashboard"));

  el("typing-form").addEventListener("submit", (e) => {
    e.preventDefault();
    submitTypingAnswer();
  });
  el("btn-typing-next").addEventListener("click", advanceSession);
  el("btn-speak-typing").addEventListener("click", () => {
    const word = currentWord();
    if (word) speech.speak(word.en, state.settings);
  });
  el("btn-speak-result").addEventListener("click", () => {
    const word = currentWord();
    if (word) speech.speak(word.en, state.settings);
  });

  document.addEventListener("keydown", (e) => {
    if (!el("view-study").classList.contains("is-active")) return;
    // Typing mode has its own <form>/Enter handling; the input needs a
    // literal space character, so the grading shortcuts below must not fire.
    if (state.settings.practiceMode === "typing") return;
    if (e.code === "Space") {
      e.preventDefault();
      if (!el("grade-buttons").classList.contains("is-hidden")) return;
      revealAnswer();
    } else if (e.key === "1" || e.key === "ArrowLeft") {
      if (!el("grade-buttons").classList.contains("is-hidden")) gradeCurrentWord(false);
    } else if (e.key === "2" || e.key === "ArrowRight") {
      if (!el("grade-buttons").classList.contains("is-hidden")) gradeCurrentWord(true);
    }
  });
}

function wireBrowse() {
  el("browse-search").addEventListener("input", (e) => renderBrowse(e.target.value));
  el("browse-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest(".row-speak-btn");
    if (btn) speech.speak(btn.dataset.word, state.settings);
  });
}

async function init() {
  state.words = await loadWords();
  state.wordsById = new Map(state.words.map((w) => [w.id, w]));

  wireNav();
  wireStudy();
  wireBrowse();
  wireSettingsForm();

  applySettingsToForm();
  await renderVoiceOptions();
  renderDashboard();
  renderBrowse();
}

init().catch((err) => {
  console.error(err);
  document.getElementById("app").innerHTML = `
    <div class="summary-box">
      <h2>Coś poszło nie tak</h2>
      <p>${err.message}</p>
    </div>`;
});
