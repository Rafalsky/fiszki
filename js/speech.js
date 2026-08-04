// Thin wrapper around the browser's Web Speech API (SpeechSynthesis).
// This is the whole "pronunciation engine" of the app — no audio files,
// no server calls, just whatever voices the user's browser/OS provides.

export function isSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let voicesCache = [];

function refreshVoices() {
  if (!isSupported()) return [];
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache;
}

/**
 * Resolves once the browser has actually populated the voice list
 * (some browsers load voices asynchronously after the page loads).
 */
export function getVoices() {
  return new Promise((resolve) => {
    if (!isSupported()) {
      resolve([]);
      return;
    }
    const existing = refreshVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(refreshVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    // Fallback in case the event never fires.
    setTimeout(() => resolve(refreshVoices()), 1000);
  });
}

export function getEnglishVoices(voices) {
  return voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
}

export function speak(text, { voiceURI, rate = 1 } = {}) {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;

  const voice = voicesCache.find((v) => v.voiceURI === voiceURI);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "en-US";
  }

  window.speechSynthesis.speak(utterance);
}
