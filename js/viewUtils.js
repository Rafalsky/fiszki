// Shared view/mode-switching helpers used by app.js (vocab) and
// js/grammarTopic.js (one instance per grammar topic page). Kept in one
// place so every page toggles the same ".view"/".mode-section" convention
// consistently.

export const el = (id) => document.getElementById(id);

export function switchView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("is-active"));
  const target = el(`view-${name}`);
  if (target) target.classList.add("is-active");
}

export function switchMode(mode) {
  document.querySelectorAll(".mode-section").forEach((m) => m.classList.remove("is-active"));
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("is-active"));
  const section = el(`mode-${mode}`);
  if (section) section.classList.add("is-active");
  const navBtn = document.querySelector(`.nav-btn[data-mode="${mode}"]`);
  if (navBtn) navBtn.classList.add("is-active");
}
