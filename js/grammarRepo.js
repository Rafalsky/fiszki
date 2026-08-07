// Grammar topic data loading. Each topic's theory/drills JSON is registered
// below via a static `new URL("...", import.meta.url)` call rather than
// built dynamically from the topics manifest, because the GitHub Pages
// deploy workflow's cache-busting step only recognizes that literal call
// shape when appending a version query string - a dynamically constructed
// URL would silently miss out on cache-busting.

const TOPICS_URL = new URL("../data/grammarTopics.json", import.meta.url);

const THEORY_URLS = {
  tenses: new URL("../data/tenses.json", import.meta.url),
  articles: new URL("../data/articles.json", import.meta.url),
  modals: new URL("../data/modals.json", import.meta.url),
  passive: new URL("../data/passive.json", import.meta.url),
  plurals: new URL("../data/plurals.json", import.meta.url),
  possessives: new URL("../data/possessives.json", import.meta.url),
  pronouns: new URL("../data/pronouns.json", import.meta.url),
  prepositions: new URL("../data/prepositions.json", import.meta.url),
  comparatives: new URL("../data/comparatives.json", import.meta.url),
  word_order: new URL("../data/word_order.json", import.meta.url),
  questions: new URL("../data/questions.json", import.meta.url),
  negation: new URL("../data/negation.json", import.meta.url),
  quantifiers: new URL("../data/quantifiers.json", import.meta.url),
  gerunds_infinitives: new URL("../data/gerunds_infinitives.json", import.meta.url),
  conditionals: new URL("../data/conditionals.json", import.meta.url),
  reported_speech: new URL("../data/reported_speech.json", import.meta.url),
  relative_clauses: new URL("../data/relative_clauses.json", import.meta.url),
  phrasal_verbs: new URL("../data/phrasal_verbs.json", import.meta.url),
  so_such_too_enough: new URL("../data/so_such_too_enough.json", import.meta.url),
  used_to_would: new URL("../data/used_to_would.json", import.meta.url),
};

const DRILLS_URLS = {
  tenses: new URL("../data/tenseDrills.json", import.meta.url),
  articles: new URL("../data/articleDrills.json", import.meta.url),
  modals: new URL("../data/modalDrills.json", import.meta.url),
  passive: new URL("../data/passiveDrills.json", import.meta.url),
  plurals: new URL("../data/pluralsDrills.json", import.meta.url),
  possessives: new URL("../data/possessivesDrills.json", import.meta.url),
  pronouns: new URL("../data/pronounsDrills.json", import.meta.url),
  prepositions: new URL("../data/prepositionsDrills.json", import.meta.url),
  comparatives: new URL("../data/comparativesDrills.json", import.meta.url),
  word_order: new URL("../data/word_orderDrills.json", import.meta.url),
  questions: new URL("../data/questionsDrills.json", import.meta.url),
  negation: new URL("../data/negationDrills.json", import.meta.url),
  quantifiers: new URL("../data/quantifiersDrills.json", import.meta.url),
  gerunds_infinitives: new URL("../data/gerunds_infinitivesDrills.json", import.meta.url),
  conditionals: new URL("../data/conditionalsDrills.json", import.meta.url),
  reported_speech: new URL("../data/reported_speechDrills.json", import.meta.url),
  relative_clauses: new URL("../data/relative_clausesDrills.json", import.meta.url),
  phrasal_verbs: new URL("../data/phrasal_verbsDrills.json", import.meta.url),
  so_such_too_enough: new URL("../data/so_such_too_enoughDrills.json", import.meta.url),
  used_to_would: new URL("../data/used_to_wouldDrills.json", import.meta.url),
};

let cachedTopics = null;
const theoryCache = new Map();
const drillsCache = new Map();

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Nie udało się wczytać danych gramatyki (HTTP ${res.status})`);
  }
  return res.json();
}

export async function loadTopics() {
  if (!cachedTopics) cachedTopics = await fetchJson(TOPICS_URL);
  return cachedTopics;
}

export async function loadTopicTheory(topicId) {
  if (!theoryCache.has(topicId)) {
    theoryCache.set(topicId, await fetchJson(THEORY_URLS[topicId]));
  }
  return theoryCache.get(topicId);
}

export async function loadTopicDrills(topicId) {
  if (!drillsCache.has(topicId)) {
    drillsCache.set(topicId, await fetchJson(DRILLS_URLS[topicId]));
  }
  return drillsCache.get(topicId);
}
