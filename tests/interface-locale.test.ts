import assert from "node:assert/strict";
import test from "node:test";
import { PENDING_NATIVE_REVIEW, TRANSLATION_REVIEW, getMessages } from "../lib/i18n/catalog";
import {
  INTERFACE_LOCALES,
  matchAcceptLanguage,
  resolveInterfaceLocale,
  storyLanguageFromInterface,
  type InterfaceLocale,
} from "../lib/i18n/locales";

const DRAFTS = ["es", "hi", "ar", "fr", "pt-BR", "ru", "ja"] as const;

function leaves(value: unknown, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === "object") {
        for (const [childKey, childValue] of leaves(child, path)) out.set(childKey, childValue);
      } else {
        out.set(path, String(child));
      }
    }
  }
  return out;
}

test("every interface locale has the same non-empty keys", () => {
  const english = leaves(getMessages("en"));
  assert.equal(INTERFACE_LOCALES.length, 10);
  for (const locale of INTERFACE_LOCALES) {
    const pack = leaves(getMessages(locale.code));
    assert.deepEqual([...pack.keys()].sort(), [...english.keys()].sort(), locale.code);
    for (const [key, value] of pack) {
      assert.equal(value.trim().length > 0, true, `${locale.code} ${key} is empty`);
    }
  }
});

test("draft locales are marked pending native review, and Chinese is not", () => {
  assert.deepEqual([...PENDING_NATIVE_REVIEW].sort(), [...DRAFTS].sort());
  assert.equal(TRANSLATION_REVIEW.en, "current");
  assert.equal(TRANSLATION_REVIEW["zh-Hant"], "current");
  assert.equal(TRANSLATION_REVIEW["zh-Hans"], "current");
  for (const code of DRAFTS) assert.equal(TRANSLATION_REVIEW[code], "pending-native-review");
});

test("Simplified Chinese is not a character-swap of the Taiwan copy", () => {
  const hans = getMessages("zh-Hans");
  const hant = getMessages("zh-Hant");
  assert.notEqual(hans.language.title, hant.language.title);
  assert.equal(hans.language.title.includes("界面"), true);
  assert.equal(hant.language.title.includes("介面"), true);
  assert.equal(hans.voice.nonNative.includes("台灣"), false);
  assert.equal(hans.voice.nonNative.includes("台湾"), false);
  assert.match(hant.voice.nonNative, /台灣/);
  assert.notEqual(hans.voice.micDenied, hant.voice.micDenied);
  assert.match(hans.voice.micDenied, /设置/);
  assert.match(hant.voice.micDenied, /設定/);
  assert.equal(hans.voice.createTitle, "写一个故事");
  assert.equal(hant.voice.createTitle, "寫一個故事");
});

test("Accept-Language picks the closest supported interface language", () => {
  assert.equal(matchAcceptLanguage(null), "en");
  assert.equal(matchAcceptLanguage("fr-CA,fr;q=0.9,en;q=0.8"), "fr");
  assert.equal(matchAcceptLanguage("zh-TW,zh;q=0.9,en;q=0.8"), "zh-Hant");
  assert.equal(matchAcceptLanguage("zh-CN,zh;q=0.9"), "zh-Hans");
  assert.equal(matchAcceptLanguage("pt-PT,pt;q=0.9"), "pt-BR");
  assert.equal(matchAcceptLanguage("ar-EG,en;q=0.5"), "ar");
  assert.equal(matchAcceptLanguage("de-DE,de;q=0.9"), "en");
  assert.equal(resolveInterfaceLocale({ cookie: "ja", acceptLanguage: "en" }), "ja");
  assert.equal(resolveInterfaceLocale({ cookie: "nope", acceptLanguage: "hi" }), "hi");
});

test("story language follows the interface only when that language is supported", () => {
  assert.equal(storyLanguageFromInterface("en"), "en");
  assert.equal(storyLanguageFromInterface("zh-Hant"), "zh-Hant");
  for (const code of ["zh-Hans", "es", "hi", "ar", "fr", "pt-BR", "ru", "ja"] as InterfaceLocale[]) {
    assert.equal(storyLanguageFromInterface(code), null);
  }
});

test("Arabic is the only right-to-left interface language", () => {
  const rtl = INTERFACE_LOCALES.filter((item) => item.dir === "rtl").map((item) => item.code);
  assert.deepEqual(rtl, ["ar"]);
});
