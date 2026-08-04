# Instrukcje dla Claude w tym repo

## Standardowy przepływ pracy: merge i deploy

W tym projekcie **nie czekamy na osobne potwierdzenie do merge'a i deployu**
po skończonej robocie — to jest tu standard. Po zakończeniu zadania na branchu
roboczym (implementacja + testy lokalne, np. Playwright):

1. Otwórz draft PR do `main` (jak zwykle).
2. Zmerguj PR (squash) do `main` bez pytania o zgodę — nie ma tu wymogu
   code review od człowieka przed merge'em.
3. Deploy jest automatyczny: push do `main` odpala
   `.github/workflows/deploy-pages.yml`, który wdraża stronę na GitHub Pages.
   Sprawdź, że run się powiódł (`conclusion: success`).
4. Zgłoś użytkownikowi krótko, że zmergowane i wdrożone (z linkiem do PR).

To dotyczy zwykłych, nieryzykownych zmian w tej aplikacji (statyczna strona,
brak backendu, brak danych produkcyjnych innych niż to co jest w repo). Jeśli
zmiana jest wyjątkowo ryzykowna/destrukcyjna (np. usuwanie dużych partii
danych, zmiana architektury przechowywania postępu użytkowników), i tak
zapytaj przed merge'em — ale to wyjątek, nie reguła.
