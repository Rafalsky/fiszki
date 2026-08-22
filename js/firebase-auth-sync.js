import { loadProgress, saveProgress, loadSettings } from "./storage.js";
import { loadGrammarProgress, saveGrammarProgress } from "./grammarStorage.js";

// Tu wkleimy konfigurację Firebase wygenerowaną w następnym kroku
const firebaseConfig = {
  apiKey: "AIzaSyCAJ4GDf1Om5KSPeIxbCV-sDQsrzZj-K3Q",
  authDomain: "fiszki-30a5d.firebaseapp.com",
  projectId: "fiszki-30a5d",
  storageBucket: "fiszki-30a5d.firebasestorage.app",
  messagingSenderId: "645485027185",
  appId: "1:645485027185:web:239f7a7256b57df0f6a0d0",
  measurementId: "G-YT3FKKBGVF"
};

// --- Inicjalizacja bibliotek wczytanych globalnie z CDN ---
// Te zmienne zostaną zdefiniowane, gdy Firebase się załaduje (w index.html)
let auth;
let db;
let googleProvider;

export let currentUser = null;

export function initFirebase() {
  wireAuthHeader();
  if (!window.firebase) {
    console.warn("Firebase SDK nie jest załadowane.");
    return;
  }
  
  if (!firebaseConfig.apiKey) {
    console.warn("Firebase config jest pusty. Zaktualizuj firebase-auth-sync.js.");
    updateAuthUI();
    return;
  }

  const app = window.firebase.initializeApp(firebaseConfig);
  auth = window.firebase.auth();
  wireAuthHeader();
  db = window.firebase.firestore();
  googleProvider = new window.firebase.auth.GoogleAuthProvider();

  // Nasłuchiwanie na zmianę stanu autoryzacji
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      console.log("Zalogowano jako:", user.email);
      onLoginMergeProgress();
    } else {
      console.log("Wylogowano.");
    }
    updateAuthUI();
  });

  // Dodanie nasłuchiwania na zamknięcie/ukrycie strony w celu wymuszenia synca
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      syncProgressToCloud(true); // wymuś natychmiastowy zapis
    }
  });
}

export function loginWithGoogle() {
  if (!auth) {
    alert("Firebase nie jest zainicjalizowany (brakuje kluczy).");
    return;
  }
  auth.signInWithPopup(googleProvider).catch((error) => {
    console.error("Błąd logowania Google:", error);
    alert("Wystąpił błąd podczas logowania: " + error.message);
  });
}

export function logout() {
  if (!auth) return;
  auth.signOut();
}

// Funkcja odpowiedzialna za pobranie danych z chmury i połączenie z danymi lokalnymi
async function onLoginMergeProgress() {
  if (!currentUser) return;
  
  try {
    const userId = currentUser.uid;
    const vocabRef = db.doc(`users/${userId}/progress/vocabulary`);
    const grammarRef = db.doc(`users/${userId}/progress/grammar`);
    
    // Używamy Promise.all, by pobrać oba dokumenty równolegle (2 odczyty)
    const [vocabDoc, grammarDoc] = await Promise.all([
      vocabRef.get(),
      grammarRef.get()
    ]);

    const cloudVocab = vocabDoc.exists ? vocabDoc.data().w || {} : {};
    const localVocab = loadProgress() || {};
    const mergedVocab = mergeLocalWithCloudData(cloudVocab, localVocab);
    saveProgress(mergedVocab); // zapisz połączone dane lokalnie
    
    const cloudGrammar = grammarDoc.exists ? grammarDoc.data().w || {} : {};
    const localGrammar = loadGrammarProgress() || {};
    const mergedGrammar = mergeLocalWithCloudData(cloudGrammar, localGrammar);
    saveGrammarProgress(mergedGrammar);

    // Zapisujemy nowy połączony stan do bazy (nadpisujemy)
    // To wykonuje się tylko raz po logowaniu
    await vocabRef.set({ w: mergedVocab }, { merge: true });
    await grammarRef.set({ w: mergedGrammar }, { merge: true });
    
    console.log("Zakończono synchronizację przy logowaniu.");
  } catch (err) {
    console.error("Błąd podczas synchronizacji na starcie:", err);
  }
}

function mergeLocalWithCloudData(cloudData, localData) {
  const merged = { ...cloudData };
  for (const [key, localValue] of Object.entries(localData)) {
    const cloudValue = merged[key];
    if (!cloudValue) {
      merged[key] = localValue;
    } else {
      // Wygrywa wyższy poziom lub nowszy czas rewizji
      const localLevel = localValue.l !== undefined ? localValue.l : localValue.level;
      const localTime = localValue.n !== undefined ? localValue.n : localValue.nextReview;
      
      const cloudLevel = cloudValue.l !== undefined ? cloudValue.l : cloudValue.level;
      const cloudTime = cloudValue.n !== undefined ? cloudValue.n : cloudValue.nextReview;

      if (localLevel > cloudLevel) {
        merged[key] = localValue;
      } else if (localLevel === cloudLevel && localTime > cloudTime) {
        merged[key] = localValue;
      } else {
        // Konwertuj stare zapisy cloudData z `level` na `l` w merged array jesli to potrzebne
        merged[key] = { l: cloudLevel, n: cloudTime };
      }
    }
    
    // Normalizacja kluczy, by zachować krótki format l i n (jeśli local miał pełne klucze)
    if (merged[key].level !== undefined) {
      merged[key] = { l: merged[key].level, n: merged[key].nextReview };
    }
  }
  return merged;
}

let syncTimeout = null;
let pendingVocabUpdates = {};
let pendingGrammarUpdates = {};

export function queueVocabSync(wordId, data) {
  if (!currentUser) return;
  pendingVocabUpdates[`w.${wordId}`] = data; // Dot notation
  scheduleSync();
}

export function queueGrammarSync(ruleId, data) {
  if (!currentUser) return;
  pendingGrammarUpdates[`w.${ruleId}`] = data; // Dot notation
  scheduleSync();
}

function scheduleSync() {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }
  // Debounce na 10 sekund (lub np. 3 minuty = 180000ms, do testów używamy 10s)
  syncTimeout = setTimeout(() => syncProgressToCloud(false), 10000);
}

async function syncProgressToCloud(forceImmediate = false) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  if (!currentUser) return;

  const vocabUpdatesToPush = { ...pendingVocabUpdates };
  const grammarUpdatesToPush = { ...pendingGrammarUpdates };
  
  // Wyczyść kolejki
  pendingVocabUpdates = {};
  pendingGrammarUpdates = {};

  const userId = currentUser.uid;
  const batch = db.batch();
  let hasUpdates = false;

  if (Object.keys(vocabUpdatesToPush).length > 0) {
    const vocabRef = db.doc(`users/${userId}/progress/vocabulary`);
    batch.update(vocabRef, vocabUpdatesToPush);
    hasUpdates = true;
  }
  
  if (Object.keys(grammarUpdatesToPush).length > 0) {
    const grammarRef = db.doc(`users/${userId}/progress/grammar`);
    batch.update(grammarRef, grammarUpdatesToPush);
    hasUpdates = true;
  }

  if (hasUpdates) {
    try {
      await batch.commit();
      console.log("Zsynchronizowano zmiany postępów z chmurą.");
    } catch (err) {
      // Jeśli dokument nie istnieje, update wyrzuci błąd, wtedy używamy set() z merge
      console.warn("Błąd batch.update (dokument może nie istnieć), ponawianie przez set()", err);
      if (Object.keys(vocabUpdatesToPush).length > 0) {
        await db.doc(`users/${userId}/progress/vocabulary`).set({ w: loadProgress() }, { merge: true });
      }
      if (Object.keys(grammarUpdatesToPush).length > 0) {
        await db.doc(`users/${userId}/progress/grammar`).set({ w: loadGrammarProgress() }, { merge: true });
      }
    }
  }
}

export function updateAuthUI() {
  const container = document.getElementById("firebase-auth-container");
  const badgeContainer = document.getElementById("user-profile-dropdown-container");
  const badge = document.getElementById("user-profile-badge");
  const avatar = document.getElementById("user-avatar");
  const headerLoginBtn = document.getElementById("btn-header-login");

  if (currentUser) {
    if (container) {
      container.innerHTML = `
        <p>Zalogowano jako: <strong>${currentUser.email}</strong></p>
        <button type="button" id="btn-logout" class="btn btn-secondary">Wyloguj</button>
      `;
      document.getElementById("btn-logout").addEventListener("click", logout);
    }
    if (badgeContainer && avatar && badge) {
      avatar.src = currentUser.photoURL || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236b7280"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
      badge.title = `Zalogowano jako: ${currentUser.displayName || currentUser.email}`;
      badgeContainer.classList.remove("is-hidden");
    }
    if (headerLoginBtn) {
      headerLoginBtn.classList.add("is-hidden");
    }
  } else {
    if (container) {
      container.innerHTML = `
        <button type="button" id="btn-login-google" class="btn btn-primary">Zaloguj się przez Google</button>
        <p class="hint">Zaloguj się, aby zsynchronizować postępy w chmurze.</p>
      `;
      document.getElementById("btn-login-google").addEventListener("click", loginWithGoogle);
    }
    if (badgeContainer) {
      badgeContainer.classList.add("is-hidden");
    }
    if (headerLoginBtn) {
      headerLoginBtn.classList.remove("is-hidden");
    }
  }
}

let authHeaderWired = false;
function wireAuthHeader() {
  if (authHeaderWired) return;
  authHeaderWired = true;

  const headerLoginBtn = document.getElementById("btn-header-login");
  if (headerLoginBtn) {
    headerLoginBtn.addEventListener("click", loginWithGoogle);
  }

  const badge = document.getElementById("user-profile-badge");
  const dropdownMenu = document.getElementById("user-dropdown-menu");
  if (badge && dropdownMenu) {
    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("is-hidden");
    });
    document.addEventListener("click", (e) => {
      if (!badge.contains(e.target) && !dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add("is-hidden");
      }
    });
  }

  const btnSettings = document.getElementById("btn-header-settings");
  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      dropdownMenu.classList.add("is-hidden");
      const settingsNavBtn = document.querySelector('.nav-btn[data-mode="settings"]');
      if (settingsNavBtn) {
        // Jesteśmy na stronie głównej (app.js obsługuje ten przycisk)
        settingsNavBtn.click();
      } else {
        // Jesteśmy na podstronie gramatyki
        const homeLink = document.querySelector(".topbar-home-link");
        const homePath = homeLink ? homeLink.getAttribute("href") : "";
        window.location.href = homePath + "#settings";
      }
    });
  }

  const btnLogout = document.getElementById("btn-header-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      dropdownMenu.classList.add("is-hidden");
      logout();
    });
  }
}



