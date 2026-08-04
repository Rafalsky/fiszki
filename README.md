# fiszki

Fiszki do nauki angielskiego słownictwa — 6000 najpopularniejszych angielskich
słów, 5-stopniowy system powtórek (Leitner) i wymowa czytana przez przeglądarkę
(Web Speech API). Postęp trzymany wyłącznie lokalnie, w `localStorage`
przeglądarki — bez backendu, bez konta, bez wysyłania czegokolwiek na serwer.

Działa jako statyczna strona — MVP wdrożone na **GitHub Pages**.

## Decyzje techniczne (zaklepane)

- **Bez build toola / frameworka.** Czysty HTML + CSS + JS (ES modules,
  `<script type="module">`). Dzięki temu GitHub Pages serwuje repo wprost,
  bez kroku kompilacji i bez `node_modules`. Prostsze MVP, mniej ruchomych
  części.
- **Baza słownictwa**: `data/words.json` — 6000 obiektów `{id, en, pl}`,
  posortowanych wg rangi częstości (id 1 = najczęstsze słowo).
  - Słowa 1–1000: powszechnie używany zbiór "1000 najpopularniejszych słów
    angielskich" (frekwencyjna lista edukacyjna, pochodząca z klasycznego
    zestawienia Carvera; wersja: `deekayen/4148741`).
  - Słowa 1001–6000: kolejne najczęstsze angielskie słowa wg listy
    frekwencyjnej `first20hours/google-10000-english` (n-gramy z Google
    Trillion Word Corpus), odfiltrowane z nazw własnych (imiona, miasta,
    stany, kraje), marek, skrótów i "spamowych"/wrażliwych słów kluczowych
    z web-corpusu (np. "phentermine", "ringtones", kategorie treści dla
    dorosłych) — ten fragment listy jest z natury coraz bardziej szumiący
    im dalej w rankingu (surowa częstość słów na stronach WWW), więc
    wymagał ręcznego czyszczenia; im dalej, tym więcej trzeba było
    odsiewać.
  - Tłumaczenia na polski są własnym opracowaniem (nie skopiowane z żadnego
    gotowego słownika dwujęzycznego). Słowa funkcyjne bez jednoznacznego
    odpowiednika (np. "the", "of", "a") mają krótki opisowy glos zamiast
    dosłownego tłumaczenia.
  - **Deduplikacja rodzin wyrazów**: lista źródłowa rankinguje pojedyncze
    tokeny, nie rodziny wyrazów, więc regularnie powtarzają się warianty
    tego samego słowa (liczba mnoga, odmiana czasownika, pisownia
    brytyjska/amerykańska — np. "colour"/"color", "organisation"/
    "organization"). Usuwane są automatycznie, ale ostrożnie: tylko gdy
    (a) angielska forma da się wyprowadzić regularnym sufiksem (-s/-es/-ed/
    -ing/-ly) z innego słowa już na liście, **i** (b) polskie tłumaczenia
    obu wpisów faktycznie się pokrywają. Nieregularne formy (np. "came" od
    "come") nigdy nie pasują do reguły sufiksowej, więc zostają — to
    świadomie osobne, wartościowe fiszki. Skrypt w pełni działa offline w
    repo, nie jest częścią aplikacji produkcyjnej.
- **System powtórek — 5-poziomowy Leitner** (`js/srs.js`):
  - Poziomy 1–5, nowe słowo startuje "poza systemem" (poziom 0) i wchodzi na
    poziom 1 przy pierwszej ocenie.
  - Dobra odpowiedź → poziom +1 (max 5) i dłuższy odstęp do kolejnej
    powtórki: 1 / 2 / 4 / 7 / 14 dni dla poziomów 1–5.
  - Zła odpowiedź → powrót na poziom 1 i powtórka natychmiast (dziś), a w
    ramach tej samej sesji fiszka wraca do kolejki po kilku kolejnych
    kartach (dodatkowe utrwalenie na gorąco).
  - Poziom 5 = słowo uznane za opanowane.
  - Kolejność kart w każdej sesji jest losowana (`srs.shuffle`, tasowanie
    Fisher-Yates) — inaczej sesje "nowe słówka" zawsze szłyby w tej samej
    kolejności rangi częstości, a "zaległe" zawsze w tej samej kolejności
    poziom→data powtórki.
- **Dwa tryby ćwiczenia** (`js/spellcheck.js`, wybór w Ustawieniach,
  domyślnie "pisanie"):
  - **Pisanie** — karta pokazuje polskie tłumaczenie, użytkownik wpisuje
    angielskie słowo. Sprawdzanie pisowni jest "human friendly": wielkość
    liter i apostrofy nie mają znaczenia (`don't` == `dont`), a odległość
    Levenshteina do poprawnej pisowni w granicach `floor(długość/4)` wciąż
    liczy się jako dobra odpowiedź (żółty "prawie", zamiast czerwonego
    "źle") — czyli ~1 literówka na 4 litery jest tolerowana, ale krótkie
    słowa (≤3 litery) muszą być dokładne. Wynik "exact" lub "close" liczy
    się w SRS jako "umiałem", "wrong" jako "nie umiałem".
  - **Samoocena** — pierwotny tryb: pokaż tłumaczenie → oceń się sam
    (umiem / nie umiem).
- **Wymowa**: `SpeechSynthesisUtterance` z `window.speechSynthesis`
  (`js/speech.js`). Ustawienia pozwalają wybrać dostępny głos angielski,
  szybkość mowy i włączyć/wyłączyć automatyczne odtwarzanie po pokazaniu
  karty. Brak plików audio — wymowa w 100% po stronie przeglądarki/systemu
  użytkownika.
- **Trwałość danych**: `localStorage`, klucze `fiszki.progress.v1` (postęp
  per słowo) i `fiszki.settings.v1` (głos, szybkość, autoplay, liczba
  nowych słówek na sesję). Brak backendu — dane nie opuszczają przeglądarki.
- **Wdrożenie**: `.github/workflows/deploy-pages.yml` — po push na `main`
  workflow kopiuje `index.html`, `css/`, `js/`, `data/` do artefaktu i
  publikuje przez `actions/deploy-pages`. W ustawieniach repo
  (Settings → Pages) źródło musi być ustawione na **GitHub Actions**.

## Struktura repo

```
index.html          punkt wejścia — tylko słownictwo (panel, sesja, słownik) i ustawienia
css/main.css         style, wspólne dla wszystkich stron (index + grammar/**)
js/
  app.js              kontroler UI słownictwa / ustawień
  srs.js              silnik 5-poziomowego systemu powtórek (Leitner)
  speech.js           wrapper na Web Speech API
  spellcheck.js       "human friendly" sprawdzanie pisowni (tryb pisania)
  storage.js          localStorage (postęp słówek + ustawienia)
  wordsRepo.js         wczytywanie data/words.json
  grammarRepo.js        wczytywanie manifestu i danych tematów gramatyki
  grammarStorage.js      localStorage (postęp ćwiczeń gramatycznych)
  grammarHub.js          renderuje grammar/index.html (siatka tematów + postęp)
  grammarTopic.js        renderuje grammar/<id>/index.html (teoria/ćwiczenia/test jednego tematu)
data/words.json      6000 słów: {id, en, pl}
data/grammarTopics.json   manifest tematów gramatyki: {id, icon, title, desc, drillCount}
data/<topic>.json         teoria danego tematu gramatyki
data/<topic>Drills.json   ćwiczenia z lukami danego tematu
grammar/
  index.html            hub — siatka wszystkich tematów gramatyki z linkami i postępem
  _template/index.html   szablon do kopiowania przy dodawaniu nowego tematu
  <topic-id>/index.html  osobna, samodzielna strona każdego tematu (własny URL)
.github/workflows/deploy-pages.yml   wdrożenie na GitHub Pages
```

Gramatyka jest rozbita na osobne strony (jeden temat = jeden katalog pod
`grammar/<id>/`, prawdziwy adres URL), a nie kolejne widoki w jednym wielkim
`index.html`. Dzięki temu strona główna (słownictwo) nigdy nie rośnie wraz z
liczbą tematów gramatyki, a każdy temat ładuje tylko własne dane — `js/app.js`
o gramatyce nic nie wie, a `grammar/index.html` (hub) dociąga tylko lekki
manifest `data/grammarTopics.json`, nigdy pełne dane tematów. Postęp per temat
na hubie liczony jest wyłącznie z `localStorage` (bez pobierania plików z
ćwiczeniami) dzięki polu `drillCount` w manifeście. Dodanie nowego tematu to:
skopiowanie `grammar/_template/` do `grammar/<id>/` i podmiana czterech
placeholderów, dwa pliki JSON z danymi, jeden wpis w manifeście i dwie linijki
w `grammarRepo.js` — żadna inna strona ani plik JS nie wymaga zmian.

## Uruchomienie lokalne

Statyczna strona, wystarczy dowolny lokalny serwer HTTP (potrzebny, bo
`fetch()` do `data/words.json` nie zadziała z `file://`):

```bash
python3 -m http.server 8000
# otwórz http://localhost:8000
```

## Funkcje MVP

- Panel z liczbą słów na każdym z 5 poziomów, liczbą zaległych powtórek i
  liczbą nietkniętych słów.
- Sesja nauki w trybie pisania (domyślnym): karta pokazuje polskie słowo
  (+ 🔊 wymowa), użytkownik wpisuje angielski odpowiednik; wynik od razu
  ocenia pisownię (idealnie / drobna literówka / źle) i pokazuje poprawną
  formę z wymową.
- Sesja nauki w trybie samooceny (do wyboru w Ustawieniach): fiszka
  pokazuje słowo angielskie + przycisk 🔊 (wymowa), po odsłonięciu
  tłumaczenia użytkownik ocenia siebie: "umiałem/am" / "nie umiałem/am".
- Skróty klawiszowe w trybie samooceny: spacja = pokaż tłumaczenie,
  1/← = nie umiałem, 2/→ = umiałem.
- Widok "Słownik" — przegląd i wyszukiwanie wszystkich 6000 słów z
  wymową i aktualnym poziomem każdego.
- Ustawienia: tryb ćwiczenia, wybór głosu, szybkość mowy, autoodtwarzanie,
  liczba nowych słówek na sesję, reset postępu.
