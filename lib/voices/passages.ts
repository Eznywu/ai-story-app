import type { AppLanguage } from "./language";

export const READING_PASSAGE: Record<AppLanguage, string> = {
  en: "Tonight the house is quiet. A small lamp glows beside the bed, and the window shows a thin moon. I am reading this so my voice can tell stories later. I speak slowly and clearly. The little horse walks across the meadow, counting five soft steps. One. Two. Three. Four. Five. The grass smells like rain. A friend waves from the gate and says, I saved you a warm blanket. They sit together and listen to the night birds. When the story ends, everyone is safe, and it is time to rest.",
  "zh-Hant":
    "今晚家裡很安靜。床邊的小燈亮著，窗外掛著一彎細月。我讀這段話，是為了以後用我的聲音講故事。我說得慢，也說得清楚。小馬走過草地，輕輕數了五步。一、二、三、四、五。草地上有雨後的味道。朋友在門口揮手，說我留了一條暖毯子。他們坐在一起，聽夜裡的鳥。故事結束的時候，大家都平安，也該休息了。",
};

/** Short line used only for a cached narrator preview. Not a full story. */
export const PREVIEW_SCRIPT: Record<AppLanguage, string> = {
  en: "The little horse whispered good night, and the stars leaned in to listen.",
  "zh-Hant": "小馬輕聲說晚安，星星都靠過來聽。",
};
