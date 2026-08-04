const TENSES_URL = new URL("../data/tenses.json", import.meta.url);
const DRILLS_URL = new URL("../data/tenseDrills.json", import.meta.url);

let cachedTenses = null;
let cachedDrills = null;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Nie udało się wczytać danych gramatyki (HTTP ${res.status})`);
  }
  return res.json();
}

export async function loadTenses() {
  if (!cachedTenses) cachedTenses = await fetchJson(TENSES_URL);
  return cachedTenses;
}

export async function loadDrills() {
  if (!cachedDrills) cachedDrills = await fetchJson(DRILLS_URL);
  return cachedDrills;
}
