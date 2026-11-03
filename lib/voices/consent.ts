/** Bump this when the consent sentence changes. Older rows keep the version they agreed to. */
export const CONSENT_TEXT_VERSION = "2026-11-01";

export const CONSENT_TEXT = {
  en: "I am an adult. I agree to upload this recording so Happy Horse can create a private narrator for my family. ElevenLabs processes the audio to build that voice. I can delete the narrator later. Deleting it removes the cloned voice and the saved sample. Stories already written keep their text. I can delete those recordings separately without deleting the story.",
  "zh-Hant":
    "我是成年人。我同意上傳這段錄音，讓 Happy Horse 為我的家庭建立專屬朗讀者。ElevenLabs 會處理這段聲音來建立聲線。我之後可以刪除這位朗讀者。刪除會移除複製的聲音和保存的樣本。已經寫好的故事會保留文字。那些錄音可以另外刪除，不必刪掉故事。",
} as const;

export function consentAccepted(input: { accepted: unknown; textVersion: unknown }): boolean {
  return input.accepted === true && input.textVersion === CONSENT_TEXT_VERSION;
}
