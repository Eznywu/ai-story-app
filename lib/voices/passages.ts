import type { AppLanguage } from "./language";

/** Short line used only for a cached narrator preview. Not a full story, and not the recording script. */
export const PREVIEW_SCRIPT: Record<AppLanguage, string> = {
  en: "The little horse whispered good night, and the stars leaned in to listen.",
  "zh-Hant": "小馬輕聲說晚安，星星都靠過來聽。",
};
