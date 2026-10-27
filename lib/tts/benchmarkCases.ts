export type BenchmarkCase = {
  id: string;
  language: "en" | "zh-Hant";
  focus: string;
  text: string;
};

/** Twenty fixed fictional lines. They are short on purpose so a future live run stays small. */
export const BENCHMARK_CASES: BenchmarkCase[] = [
  {
    id: "en-ordinary",
    language: "en",
    focus: "Ordinary narration",
    text: "The night light stayed warm while Bramble counted three slow breaths.",
  },
  {
    id: "en-dialogue",
    language: "en",
    focus: "Dialogue",
    text: "“Are you sleepy?” asked Bramble. “A little,” said the moon, “but I can wait.”",
  },
  {
    id: "en-name",
    language: "en",
    focus: "Difficult fictional name",
    text: "Xylophina found a blue pebble and put it under the pillow.",
  },
  {
    id: "en-pending-name",
    language: "en",
    focus: "Personal name left unchanged",
    text: "Eason closed the little book and listened to the rain.",
  },
  {
    id: "en-numbers",
    language: "en",
    focus: "Numbers and a decimal",
    text: "Bramble had 3 blankets and a mug marked 3.14.",
  },
  {
    id: "en-date",
    language: "en",
    focus: "Date",
    text: "On October 27, 2026, the lantern was lit just once.",
  },
  {
    id: "en-abbreviations",
    language: "en",
    focus: "Abbreviations",
    text: "Dr. Bramble turned the TV off before the U.S.A. postcard slipped to the floor.",
  },
  {
    id: "en-question",
    language: "en",
    focus: "Question",
    text: "Will the little boat still be here in the morning?",
  },
  {
    id: "en-pause-shift",
    language: "en",
    focus: "Pause and a gentle change of feeling",
    text: "Bramble waited… then smiled. The room felt quiet, and nobody shouted.",
  },
  {
    id: "en-longer",
    language: "en",
    focus: "Longer narration",
    text: "Bramble walked the long way home past the quiet trees. The path was soft, the wind was small, and every step had time to finish. At the gate, the fox shook the rain from one ear and looked back only once.",
  },
  {
    id: "en-two-paragraphs",
    language: "en",
    focus: "Paragraph boundary",
    text: "The first paragraph ends at the window.\n\nThe second paragraph begins with the kettle and ends with goodnight.",
  },
  {
    id: "zh-ordinary",
    language: "zh-Hant",
    focus: "Ordinary Chinese narration",
    text: "小狐狸把被子拉好，看著青石灣的燈一盞一盞暗下來。",
  },
  {
    id: "zh-dialogue",
    language: "zh-Hant",
    focus: "Chinese dialogue",
    text: "「你還醒著嗎？」月亮問。小狐狸說：「醒著，可是眼睛想休息。」",
  },
  {
    id: "zh-polyphone",
    language: "zh-Hant",
    focus: "Polyphonic characters left unchanged",
    text: "快樂的樂和音樂的樂還在等大人決定，月亮升上來了。",
  },
  {
    id: "zh-pending-name",
    language: "zh-Hant",
    focus: "Personal name left unchanged",
    text: "單舟把燈放低，沒有讓故事變大聲。",
  },
  {
    id: "zh-numbers",
    language: "zh-Hant",
    focus: "Chinese numbers",
    text: "枕頭邊有 3 顆小石子，杯子上寫著 3.14。",
  },
  {
    id: "zh-date",
    language: "zh-Hant",
    focus: "Chinese date",
    text: "2026年10月27日，青石灣只點了一盞燈。",
  },
  {
    id: "zh-mixed",
    language: "zh-Hant",
    focus: "Mixed Chinese and English",
    text: "他輕聲說 Happy，然後把 TV 關掉，再說一聲晚安。",
  },
  {
    id: "zh-question",
    language: "zh-Hant",
    focus: "Chinese question and pause",
    text: "小船明天還會在嗎？小狐狸想了想…然後把眼睛閉上。",
  },
  {
    id: "zh-phrase",
    language: "zh-Hant",
    focus: "Disambiguated phrase",
    text: "故事裡的銀行只是一間小小的橡實店，門口沒有人排隊。",
  },
];

export function assertBenchmarkCaseCount(cases: BenchmarkCase[] = BENCHMARK_CASES): void {
  if (cases.length !== 20) {
    throw new Error(`Expected 20 narration benchmark cases, found ${cases.length}.`);
  }
}
