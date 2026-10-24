/** Session keys for `/play`, which reloads the last narration saved on the server. */
export const LAST_AUDIO_URL_KEY = "emrsy.lastAudioUrl";
export const LAST_AUDIO_TITLE_KEY = "emrsy.lastAudioTitle";

export function rememberLastAudio(url: string, title: string) {
  if (typeof window === "undefined") return;
  if (!url.startsWith("/api/audio/")) return;
  try {
    sessionStorage.setItem(LAST_AUDIO_URL_KEY, url);
    sessionStorage.setItem(LAST_AUDIO_TITLE_KEY, title.trim() || "Story");
  } catch {
    /* private mode / blocked storage */
  }
}
