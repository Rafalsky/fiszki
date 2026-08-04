const DATA_URL = new URL("../data/words.json", import.meta.url);

let cachedWords = null;

export async function loadWords() {
  if (cachedWords) return cachedWords;
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error(`Nie udało się wczytać listy słówek (HTTP ${res.status})`);
  }
  cachedWords = await res.json();
  return cachedWords;
}
