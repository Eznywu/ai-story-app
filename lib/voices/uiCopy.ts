import { CONSENT_TEXT, CONSENT_TEXT_VERSION } from "./consent";
import { READING_PASSAGE } from "./passages";
import { normalizeAppLanguage, type AppLanguage } from "./language";

export function voiceCopy(language: unknown) {
  const lang: AppLanguage = normalizeAppLanguage(language);
  const zh = lang === "zh-Hant";
  return {
    lang,
    consentVersion: CONSENT_TEXT_VERSION,
    consent: CONSENT_TEXT[lang],
    passage: READING_PASSAGE[lang],
    storyVoices: zh ? "故事聲音" : "Story voices",
    myVoices: zh ? "我的聲音" : "My voices",
    add: zh ? "加入我的聲音" : "Add my voice",
    language: zh ? "語言" : "Language",
    english: "English",
    chinese: "中文",
    preview: zh ? "試聽" : "Preview",
    previewStop: zh ? "停止" : "Stop",
    selected: zh ? "已選擇" : "Selected",
    pending: zh ? "還在確認，暫時不能選" : "Waiting for verification. Not ready to select.",
    signInTitle: zh ? "個人聲音需要登入" : "A personal voice needs sign-in",
    signInBody: zh
      ? "故事聲音每個人都能用。錄下自己的聲音需要獨立的帳號，不會存在共用的訪客身份上。這個環境若尚未開啟登入，請先請家人帳號的管理者打開電子郵件登入。"
      : "Story voices work for everyone. Recording your own voice needs its own signed-in account. It is never saved on the shared guest. If sign-in is still paused here, ask the account owner to turn on email sign-in.",
    signIn: zh ? "了解登入" : "About sign-in",
    consentTitle: zh ? "先同意，再錄音" : "Agree, then record",
    agree: zh ? "我同意" : "I agree",
    record: zh ? "開始錄音" : "Start recording",
    stop: zh ? "停止" : "Stop",
    listen: zh ? "聽一次" : "Listen",
    discard: zh ? "捨棄" : "Discard",
    again: zh ? "重錄" : "Record again",
    useTake: zh ? "用這一段建立聲音" : "Create a voice from this take",
    nameLabel: zh ? "這個聲音的名字" : "Name this voice",
    save: zh ? "儲存並選用" : "Save and use",
    target: zh ? "目標是 60 到 120 秒。請照著念。" : "Aim for 60 to 120 seconds. Read the passage aloud.",
    micDenied: zh
      ? "麥克風被拒絕了。iPhone Safari：設定 → Safari → 麥克風 → 允許。Chrome：網址列的鎖頭 → 網站設定 → 麥克風 → 允許。若是安裝的 App：iPhone 設定 → Bedtime Story → 麥克風。改完後再試一次。"
      : "The microphone is blocked. On iPhone Safari: Settings → Safari → Microphone → Allow. In Chrome: the lock icon → Site settings → Microphone → Allow. In the installed app: iPhone Settings → Bedtime Story → Microphone. Then try again.",
    tooQuiet: zh ? "幾乎沒有說話聲。靠近一點，再念一次。" : "There was not enough speech. Move closer and read it again.",
    clipped: zh ? "聲音太大、破音了。拿遠一點再錄。" : "That was too loud and clipped. Hold the phone a little farther away.",
    short: zh ? "還有點短。滿 60 秒會比較好，滿 10 秒就可以使用。" : "A little short. 60 seconds is better. 10 seconds is the minimum.",
    interrupted: zh ? "錄音中斷了。可以重錄。" : "The recording was interrupted. You can record again.",
    failed: zh ? "沒有成功。可以再試一次。" : "That did not work. You can try again.",
    verification: zh ? "聲音已建立，但還在確認，所以現在不能選用。" : "The voice was created, but it is waiting for verification, so it cannot be selected yet.",
    delete: zh ? "刪除" : "Delete",
    rename: zh ? "改名" : "Rename",
    deleteAudio: zh ? "一併刪除用這個聲音做的錄音，故事文字會留下" : "Also delete recordings made with this voice. The story text stays.",
    emptyMine: zh ? "還沒有自己的聲音。" : "No personal voices yet.",
    incompatible: zh ? "這個聲音是用另一種語言錄的。它會留在選取狀態。你可以改選下面的故事聲音。" : "This voice was recorded in another language. It stays selected. You can choose a story voice below.",
  };
}
