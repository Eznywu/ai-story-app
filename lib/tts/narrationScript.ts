import { applicableAliases, languageMatches, type PronunciationDictionary, type PronunciationEntry } from "./pronunciationDictionary";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ZH_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export type NarrationScript = {
  /** Exact story text. Never rewritten. */
  displayText: string;
  script: string;
  appliedEntryIds: string[];
  pendingEntryIds: string[];
};

export function buildNarrationScript(displayText: string, language: string, dictionary: PronunciationDictionary): NarrationScript {
  const display = String(displayText ?? "");
  let script = cleanupWhitespace(display);
  const { text, applied } = applyAliases(script, dictionary, language);
  script = text;
  script = language.toLowerCase().startsWith("zh") ? expandChineseSpeech(script) : expandEnglishSpeech(script);
  script = cleanupWhitespace(script);
  return {
    displayText: display,
    script,
    appliedEntryIds: applied,
    pendingEntryIds: pendingHits(display, dictionary, language),
  };
}

export function cleanupWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * The old narration cleanup. Kept here so tests can show it splits decimals and acronyms.
 * It is not used when building a narration script.
 */
export function legacyPunctuationSpacing(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/([，。！？；：、])\s*/g, "$1")
    .replace(/([,.!?;:])\s*/g, "$1 ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function applyAliases(text: string, dictionary: PronunciationDictionary, language: string): { text: string; applied: string[] } {
  let out = text;
  const applied: string[] = [];
  for (const entry of applicableAliases(dictionary, language)) {
    const pattern = termPattern(entry);
    if (!pattern.test(out)) continue;
    pattern.lastIndex = 0;
    out = out.replace(pattern, entry.alias);
    applied.push(entry.id);
  }
  return { text: out, applied };
}

function pendingHits(text: string, dictionary: PronunciationDictionary, language: string): string[] {
  const hits: string[] = [];
  for (const entry of dictionary.entries) {
    if (entry.reviewStatus !== "pending") continue;
    if (!languageMatches(entry.language, language)) continue;
    if (entry.term.length < 2) continue;
    const pattern = termPattern(entry);
    if (pattern.test(text)) hits.push(entry.id);
  }
  return hits;
}

function termPattern(entry: PronunciationEntry): RegExp {
  const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const latin = /[A-Za-z.]/.test(entry.term);
  if (!latin) return new RegExp(escaped, "g");
  return new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "gi");
}

function expandEnglishSpeech(text: string): string {
  let out = text;
  out = out.replace(
    new RegExp(`\\b(${MONTHS.join("|")})\\s+(\\d{1,2})(?:,)?\\s+(\\d{4})\\b`, "g"),
    (_all, month: string, day: string, year: string) => `${month} ${ordinal(Number(day))}, ${englishYear(Number(year))}`
  );
  out = out.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (_all, year: string, month: string, day: string) => {
    const monthName = MONTHS[Number(month) - 1];
    if (!monthName) return `${year}-${month}-${day}`;
    return `${monthName} ${ordinal(Number(day))}, ${englishYear(Number(year))}`;
  });
  out = out.replace(/(?<!\d)(\d+)\.(\d+)(?!\d)/g, (_all, whole: string, frac: string) => {
    const digits = frac.split("").map((digit) => ONES[Number(digit)] ?? digit).join(" ");
    return `${englishCardinal(Number(whole))} point ${digits}`;
  });
  out = out.replace(/(?<!\d)(\d+)(?!\d)/g, (match) => {
    const value = Number(match);
    if (!Number.isInteger(value) || value > 9999) return match;
    return englishCardinal(value);
  });
  return out;
}

function expandChineseSpeech(text: string): string {
  let out = text;
  out = out.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, (_all, year: string, month: string, day: string) => {
    return `${chineseDigits(year)}年${chineseCounting(Number(month))}月${chineseCounting(Number(day))}日`;
  });
  out = out.replace(/(\d{4})-(\d{2})-(\d{2})/g, (_all, year: string, month: string, day: string) => {
    return `${chineseDigits(year)}年${chineseCounting(Number(month))}月${chineseCounting(Number(day))}日`;
  });
  out = out.replace(/(?<!\d)(\d+)\.(\d+)(?!\d)/g, (_all, whole: string, frac: string) => {
    return `${chineseCounting(Number(whole))}點${chineseDigits(frac)}`;
  });
  out = out.replace(/(?<!\d)(\d+)(?!\d)/g, (match) => {
    const value = Number(match);
    if (!Number.isInteger(value) || value > 9999) return match;
    return chineseCounting(value);
  });
  return out;
}

/** Cardinal reading. Never calls englishYear. */
function englishCardinal(value: number): string {
  if (!Number.isInteger(value) || value < 0) return String(value);
  if (value < 20) return ONES[value];
  if (value < 100) {
    const ten = Math.floor(value / 10);
    const one = value % 10;
    return one ? `${TENS[ten]}-${ONES[one]}` : TENS[ten];
  }
  if (value < 1000) {
    const hundred = Math.floor(value / 100);
    const rest = value % 100;
    return rest ? `${ONES[hundred]} hundred ${englishCardinal(rest)}` : `${ONES[hundred]} hundred`;
  }
  if (value < 10000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    const head = `${ONES[thousands]} thousand`;
    return rest ? `${head} ${englishCardinal(rest)}` : head;
  }
  return String(value);
}

/**
 * Year reading for dates. Uses cardinals only for the pieces, so 2100–9999
 * cannot recurse back into this function.
 */
function englishYear(value: number): string {
  if (value >= 2000 && value < 2010) {
    return value === 2000 ? "two thousand" : `two thousand ${englishCardinal(value - 2000)}`;
  }
  if (value >= 2010 && value <= 2099) {
    return `twenty ${englishCardinal(value - 2000)}`;
  }
  if (value >= 1000 && value <= 1999) {
    const century = Math.floor(value / 100);
    const rest = value % 100;
    const head = englishCardinal(century);
    if (rest === 0) return `${head} hundred`;
    return `${head} ${englishCardinal(rest)}`;
  }
  if (value >= 2100 && value <= 9999) {
    if (value % 1000 === 0) return englishCardinal(value);
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    if (rest === 0) return `${englishCardinal(hundreds)} hundred`;
    const tail = rest < 10 ? `oh-${ONES[rest]}` : englishCardinal(rest);
    return `${englishCardinal(hundreds)} ${tail}`;
  }
  return englishCardinal(value);
}

function ordinal(day: number): string {
  const word = englishCardinal(day);
  if (word.endsWith("one") && !word.endsWith("eleven")) return word.replace(/one$/, "first");
  if (word.endsWith("two")) return word.replace(/two$/, "second");
  if (word.endsWith("three")) return word.replace(/three$/, "third");
  if (word.endsWith("five")) return word.replace(/five$/, "fifth");
  if (word.endsWith("eight")) return word.replace(/eight$/, "eighth");
  if (word.endsWith("nine")) return word.replace(/nine$/, "ninth");
  if (word.endsWith("twelve")) return "twelfth";
  if (word === "twenty") return "twentieth";
  if (word.endsWith("y")) return `${word.slice(0, -1)}ieth`;
  return `${word}th`;
}

function chineseDigits(digits: string): string {
  return digits.split("").map((digit) => ZH_DIGITS[Number(digit)] ?? digit).join("");
}

function chineseCounting(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 9999) return String(value);
  if (value < 10) return ZH_DIGITS[value];
  if (value < 20) return value === 10 ? "十" : `十${ZH_DIGITS[value % 10]}`;
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${ZH_DIGITS[tens]}十${ones ? ZH_DIGITS[ones] : ""}`;
  }
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    if (!rest) return `${ZH_DIGITS[hundreds]}百`;
    if (rest < 10) return `${ZH_DIGITS[hundreds]}百零${ZH_DIGITS[rest]}`;
    return `${ZH_DIGITS[hundreds]}百${chineseCounting(rest)}`;
  }
  const thousands = Math.floor(value / 1000);
  const rest = value % 1000;
  if (!rest) return `${ZH_DIGITS[thousands]}千`;
  if (rest < 100) return `${ZH_DIGITS[thousands]}千零${chineseCounting(rest)}`;
  return `${ZH_DIGITS[thousands]}千${chineseCounting(rest)}`;
}
