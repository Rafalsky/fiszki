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
  wish_ifonly: new URL("../data/wish_ifonly.json", import.meta.url),
  causative: new URL("../data/causative.json", import.meta.url),
  adjective_order: new URL("../data/adjective_order.json", import.meta.url),
  adverbs: new URL("../data/adverbs.json", import.meta.url),
  future_forms: new URL("../data/future_forms.json", import.meta.url),
  determiners: new URL("../data/determiners.json", import.meta.url),
  linking_words: new URL("../data/linking_words.json", import.meta.url),
  direct_indirect_objects: new URL("../data/direct_indirect_objects.json", import.meta.url),
  participle_clauses: new URL("../data/participle_clauses.json", import.meta.url),
  modals_perfect: new URL("../data/modals_perfect.json", import.meta.url),
  verb_patterns: new URL("../data/verb_patterns.json", import.meta.url),
  inversion: new URL("../data/inversion.json", import.meta.url),
  cleft_sentences: new URL("../data/cleft_sentences.json", import.meta.url),
  ellipsis_substitution: new URL("../data/ellipsis_substitution.json", import.meta.url),
  emphasis: new URL("../data/emphasis.json", import.meta.url),
  subjunctive: new URL("../data/subjunctive.json", import.meta.url),
  word_formation: new URL("../data/word_formation.json", import.meta.url),
  collocations_prepositions: new URL("../data/collocations_prepositions.json", import.meta.url),
  discourse_markers: new URL("../data/discourse_markers.json", import.meta.url),
  british_american: new URL("../data/british_american.json", import.meta.url),
  time_clauses: new URL("../data/time_clauses.json", import.meta.url),
  subject_verb_agreement: new URL("../data/subject_verb_agreement.json", import.meta.url),
  imperatives: new URL("../data/imperatives.json", import.meta.url),
  there_is_are: new URL("../data/there_is_are.json", import.meta.url),
  exclamatives: new URL("../data/exclamatives.json", import.meta.url),
  would_rather_had_better: new URL("../data/would_rather_had_better.json", import.meta.url),
  purpose_clauses: new URL("../data/purpose_clauses.json", import.meta.url),
  passive_reporting: new URL("../data/passive_reporting.json", import.meta.url),
  ing_ed_adjectives: new URL("../data/ing_ed_adjectives.json", import.meta.url),
  partitives: new URL("../data/partitives.json", import.meta.url),
  correlative_conjunctions: new URL("../data/correlative_conjunctions.json", import.meta.url),
  indefinite_pronouns: new URL("../data/indefinite_pronouns.json", import.meta.url),
  modals_deduction: new URL("../data/modals_deduction.json", import.meta.url),
  double_comparatives: new URL("../data/double_comparatives.json", import.meta.url),
  concessive_clauses: new URL("../data/concessive_clauses.json", import.meta.url),
  stative_verbs: new URL("../data/stative_verbs.json", import.meta.url),
  compound_nouns: new URL("../data/compound_nouns.json", import.meta.url),
  degree_adverbs: new URL("../data/degree_adverbs.json", import.meta.url),
  reciprocal_pronouns: new URL("../data/reciprocal_pronouns.json", import.meta.url),
  numbers_dates: new URL("../data/numbers_dates.json", import.meta.url),
  noun_clauses: new URL("../data/noun_clauses.json", import.meta.url),
  litotes: new URL("../data/litotes.json", import.meta.url),
  as_if_as_though: new URL("../data/as_if_as_though.json", import.meta.url),
  nominalization: new URL("../data/nominalization.json", import.meta.url),
  reporting_verb_patterns: new URL("../data/reporting_verb_patterns.json", import.meta.url),
  absolute_clauses: new URL("../data/absolute_clauses.json", import.meta.url),
  modal_passive: new URL("../data/modal_passive.json", import.meta.url),
  complex_prepositions: new URL("../data/complex_prepositions.json", import.meta.url),
  ergative_verbs: new URL("../data/ergative_verbs.json", import.meta.url),
  apposition: new URL("../data/apposition.json", import.meta.url),
  fronting: new URL("../data/fronting.json", import.meta.url),
  focusing_adverbs: new URL("../data/focusing_adverbs.json", import.meta.url),
  get_passive: new URL("../data/get_passive.json", import.meta.url),
  viewpoint_adverbs: new URL("../data/viewpoint_adverbs.json", import.meta.url),
  future_in_the_past: new URL("../data/future_in_the_past.json", import.meta.url),
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
  wish_ifonly: new URL("../data/wish_ifonlyDrills.json", import.meta.url),
  causative: new URL("../data/causativeDrills.json", import.meta.url),
  adjective_order: new URL("../data/adjective_orderDrills.json", import.meta.url),
  adverbs: new URL("../data/adverbsDrills.json", import.meta.url),
  future_forms: new URL("../data/future_formsDrills.json", import.meta.url),
  determiners: new URL("../data/determinersDrills.json", import.meta.url),
  linking_words: new URL("../data/linking_wordsDrills.json", import.meta.url),
  direct_indirect_objects: new URL("../data/direct_indirect_objectsDrills.json", import.meta.url),
  participle_clauses: new URL("../data/participle_clausesDrills.json", import.meta.url),
  modals_perfect: new URL("../data/modals_perfectDrills.json", import.meta.url),
  verb_patterns: new URL("../data/verb_patternsDrills.json", import.meta.url),
  inversion: new URL("../data/inversionDrills.json", import.meta.url),
  cleft_sentences: new URL("../data/cleft_sentencesDrills.json", import.meta.url),
  ellipsis_substitution: new URL("../data/ellipsis_substitutionDrills.json", import.meta.url),
  emphasis: new URL("../data/emphasisDrills.json", import.meta.url),
  subjunctive: new URL("../data/subjunctiveDrills.json", import.meta.url),
  word_formation: new URL("../data/word_formationDrills.json", import.meta.url),
  collocations_prepositions: new URL("../data/collocations_prepositionsDrills.json", import.meta.url),
  discourse_markers: new URL("../data/discourse_markersDrills.json", import.meta.url),
  british_american: new URL("../data/british_americanDrills.json", import.meta.url),
  time_clauses: new URL("../data/time_clausesDrills.json", import.meta.url),
  subject_verb_agreement: new URL("../data/subject_verb_agreementDrills.json", import.meta.url),
  imperatives: new URL("../data/imperativesDrills.json", import.meta.url),
  there_is_are: new URL("../data/there_is_areDrills.json", import.meta.url),
  exclamatives: new URL("../data/exclamativesDrills.json", import.meta.url),
  would_rather_had_better: new URL("../data/would_rather_had_betterDrills.json", import.meta.url),
  purpose_clauses: new URL("../data/purpose_clausesDrills.json", import.meta.url),
  passive_reporting: new URL("../data/passive_reportingDrills.json", import.meta.url),
  ing_ed_adjectives: new URL("../data/ing_ed_adjectivesDrills.json", import.meta.url),
  partitives: new URL("../data/partitivesDrills.json", import.meta.url),
  correlative_conjunctions: new URL("../data/correlative_conjunctionsDrills.json", import.meta.url),
  indefinite_pronouns: new URL("../data/indefinite_pronounsDrills.json", import.meta.url),
  modals_deduction: new URL("../data/modals_deductionDrills.json", import.meta.url),
  double_comparatives: new URL("../data/double_comparativesDrills.json", import.meta.url),
  concessive_clauses: new URL("../data/concessive_clausesDrills.json", import.meta.url),
  stative_verbs: new URL("../data/stative_verbsDrills.json", import.meta.url),
  compound_nouns: new URL("../data/compound_nounsDrills.json", import.meta.url),
  degree_adverbs: new URL("../data/degree_adverbsDrills.json", import.meta.url),
  reciprocal_pronouns: new URL("../data/reciprocal_pronounsDrills.json", import.meta.url),
  numbers_dates: new URL("../data/numbers_datesDrills.json", import.meta.url),
  noun_clauses: new URL("../data/noun_clausesDrills.json", import.meta.url),
  litotes: new URL("../data/litotesDrills.json", import.meta.url),
  as_if_as_though: new URL("../data/as_if_as_thoughDrills.json", import.meta.url),
  nominalization: new URL("../data/nominalizationDrills.json", import.meta.url),
  reporting_verb_patterns: new URL("../data/reporting_verb_patternsDrills.json", import.meta.url),
  absolute_clauses: new URL("../data/absolute_clausesDrills.json", import.meta.url),
  modal_passive: new URL("../data/modal_passiveDrills.json", import.meta.url),
  complex_prepositions: new URL("../data/complex_prepositionsDrills.json", import.meta.url),
  ergative_verbs: new URL("../data/ergative_verbsDrills.json", import.meta.url),
  apposition: new URL("../data/appositionDrills.json", import.meta.url),
  fronting: new URL("../data/frontingDrills.json", import.meta.url),
  focusing_adverbs: new URL("../data/focusing_adverbsDrills.json", import.meta.url),
  get_passive: new URL("../data/get_passiveDrills.json", import.meta.url),
  viewpoint_adverbs: new URL("../data/viewpoint_adverbsDrills.json", import.meta.url),
  future_in_the_past: new URL("../data/future_in_the_pastDrills.json", import.meta.url),
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
