import { expect, test, type Page } from "@playwright/test";
import { signInRecordingParent } from "./helpers/recordingParent";
import { getMessages } from "../../lib/i18n/catalog";
import { INTERFACE_LOCALES, type InterfaceLocale } from "../../lib/i18n/locales";
import { RECORDING_SCRIPTS, RECORDING_SCRIPT_VERSION } from "../../lib/voices/recordingScripts";

const ORIGIN = "http://127.0.0.1:3456";

async function boot(page: Page) {
  const userId = await signInRecordingParent(page);
  await page.context().addCookies([{ name: "hh_ui_locale", value: "en", url: ORIGIN }]);
  await page.addInitScript((id) => {
    localStorage.setItem("hh_ui_locale", "en");
    localStorage.setItem(
      `emrsy.onboarding.v1.${id}`,
      JSON.stringify({ completed: true, selectedIntent: null, consentedToVoice: false })
    );
    localStorage.setItem(
      "happy-horse.createDraft.v1",
      JSON.stringify({
        age: "4 years",
        language: "en",
        mainCharacterName: "Milo",
        childGender: "any",
        genre: "Animals",
        length: "short",
        storyInput: "",
        theme: "",
        mood: "",
        seriesMode: "one_shot",
        educationalGoal: "",
        moralLesson: "",
        selectedVoiceId: "story-grandpa",
      })
    );
    document.documentElement.dataset.hhVoiceMock = "1";
    (window as unknown as { __HH_VOICE_TEST?: unknown }).__HH_VOICE_TEST = {
      voicedMs: 12_000,
      clipped: false,
      durationMs: 15_000,
    };
  }, userId);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?tab=create");
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
  await expect
    .poll(async () => {
      return page.evaluate(async () => {
        const response = await fetch("/api/voices?language=en", { cache: "no-store" });
        const data = (await response.json()) as { personalVoices?: string };
        return data.personalVoices || "";
      });
    })
    .toBe("available");
  await clearPersonalVoices(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
}

async function clearPersonalVoices(page: Page) {
  const existing = await page.request.get("/api/voices?language=en");
  const body = (await existing.json()) as { voices?: { id?: string; kind?: string }[] };
  for (const voice of body.voices || []) {
    if (voice.kind === "personal" && voice.id) {
      await page.request.delete(`/api/voices/${encodeURIComponent(voice.id)}`, { data: { deleteGeneratedAudio: false } });
    }
  }
}

async function chooseInterfaceLocale(page: Page, locale: InterfaceLocale) {
  const meta = INTERFACE_LOCALES.find((item) => item.code === locale);
  if (!meta) throw new Error(locale);
  await page.getByTestId("interface-language-button").click();
  await page.getByRole("radio", { name: meta.nativeName }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", meta.htmlLang);
  await expect(page.locator("html")).toHaveAttribute("dir", meta.dir);
}

async function armTake(page: Page) {
  await page.evaluate(() => {
    document.documentElement.dataset.hhVoiceMock = "1";
    (window as unknown as { __HH_VOICE_TEST?: unknown }).__HH_VOICE_TEST = {
      voicedMs: 12_000,
      clipped: false,
      durationMs: 15_000,
    };
  });
}

async function openRecorder(page: Page, locale: InterfaceLocale) {
  const copy = getMessages(locale).voice;
  await page.getByRole("button", { name: copy.makeVoiceTitle }).click();
  await page.getByRole("checkbox", { name: copy.agree }).check();
  await page.getByRole("button", { name: copy.record }).click();
  await page.getByRole("button", { name: copy.allowMic }).click();
  await expect(page.locator(".voiceFlow__passage")).toBeVisible();
  return copy;
}

test.beforeEach(async ({ page }) => {
  await boot(page);
});

for (const locale of INTERFACE_LOCALES.map((item) => item.code)) {
  test(`MOCK provider: recording script follows ${locale} and is stored as that locale`, async ({ page }) => {
    await chooseInterfaceLocale(page, locale);
    const copy = getMessages(locale).voice;
    const storyLanguages = page.getByRole("group", { name: copy.language });
    await expect(storyLanguages.getByRole("button")).toHaveCount(2);
    await expect(storyLanguages.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    await expect(storyLanguages.getByRole("button", { name: "中文" })).toHaveAttribute("aria-pressed", "false");

    const script = RECORDING_SCRIPTS[locale];
    await openRecorder(page, locale);
    const passage = page.locator(".voiceFlow__passage");
    await expect(passage).toContainText(script.passage.slice(0, 24));
    await expect(passage).toContainText(script.phrases.slice(0, 12));
    await expect(passage).not.toContainText("scriptVersion");
    await expect(passage).not.toContainText("##");
    if (locale !== "en") await expect(passage).not.toContainText("Tonight, the house is quiet");
    if (locale === "zh-Hans") {
      await expect(passage).toContainText("家里很安静");
      await expect(passage).not.toContainText("家裡很安靜");
    }
    if (locale === "zh-Hant") {
      await expect(passage).toContainText("家裡很安靜");
      await expect(passage).not.toContainText("家里很安静");
    }

    await armTake(page);
    await page.waitForTimeout(8_000);
    await page.getByRole("button", { name: copy.stop }).click();
    const saved = page.waitForResponse((response) => response.url().includes("/api/voice-clone") && response.request().method() === "POST");
    await page.getByRole("button", { name: copy.useTake }).click();
    const response = await saved;
    expect(response.ok()).toBeTruthy();
    const payload = (await response.json()) as {
      voice?: { language?: string; recordingLocale?: string; scriptVersion?: string };
    };
    expect(payload.voice?.language).toBe(locale);
    expect(payload.voice?.recordingLocale).toBe(locale);
    expect(payload.voice?.scriptVersion).toBe(RECORDING_SCRIPT_VERSION);
    expect(payload.voice?.language).not.toBe(locale === "en" ? "zh-Hant" : "en");

    const listed = await page.request.get(`/api/voices?language=en`);
    const list = (await listed.json()) as {
      voices?: { kind?: string; recordingLocale?: string; scriptVersion?: string; language?: string }[];
    };
    const mine = (list.voices || []).filter((voice) => voice.kind === "personal");
    expect(mine.some((voice) => voice.recordingLocale === locale && voice.scriptVersion === RECORDING_SCRIPT_VERSION && voice.language === locale)).toBe(
      true
    );
    await clearPersonalVoices(page);
  });
}

test("switching app language during a take does not change the passage", async ({ page }) => {
  const copy = await openRecorder(page, "en");
  await armTake(page);
  const passage = page.locator(".voiceFlow__passage");
  await expect(passage).toContainText("Tonight, the house is quiet");
  // Exercise the existing language controls while the take remains open.
  await page.getByTestId("interface-language-button").evaluate((button: HTMLButtonElement) => button.click());
  await page.getByRole("radio", { name: "日本語" }).evaluate((button: HTMLElement) => button.click());
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
  await expect(passage).toContainText("Tonight, the house is quiet");
  await expect(passage).not.toContainText("今夜、おうちの中は静かです");
  await expect(page.getByRole("button", { name: "停止" })).toBeVisible();
  await expect(page.getByRole("button", { name: copy.stop })).toHaveCount(0);
});

test("record, replay, retry, save, preview, and delete still work", async ({ page }) => {
  const copy = getMessages("en").voice;
  await openRecorder(page, "en");
  await armTake(page);
  await page.waitForTimeout(8_000);
  await page.getByRole("button", { name: copy.stop }).click();
  await expect(page.getByRole("button", { name: copy.play })).toBeVisible();
  await page.getByRole("button", { name: copy.again }).click();
  await expect(page.locator(".voiceFlow__passage")).toContainText("Tonight, the house is quiet");
  await armTake(page);
  await page.waitForTimeout(8_000);
  await page.getByRole("button", { name: copy.stop }).click();
  await page.getByRole("button", { name: copy.useTake }).click();
  await expect(page.getByRole("heading", { name: copy.previewTitle })).toBeVisible();
  const preview = page.waitForResponse((response) => response.url().includes("/api/voice-preview"));
  await page.getByRole("button", { name: new RegExp(copy.preview) }).click();
  const previewResponse = await preview;
  expect(previewResponse.status()).toBeGreaterThanOrEqual(400);
  expect(previewResponse.headers()["content-type"] || "").toContain("json");
  const previewBody = (await previewResponse.json()) as { reason?: string };
  expect(previewBody.reason === "no_provider_voice" || previewBody.reason === "live_preview_off").toBeTruthy();
  await expect(page.getByText(copy.previewUnavailable)).toBeVisible();
  await page.getByRole("button", { name: copy.continueName }).click();
  await page.getByRole("button", { name: copy.save }).click();
  await expect(page.getByRole("button", { name: copy.change })).toBeVisible();
  await page.getByRole("button", { name: copy.change }).click();
  await page.getByRole("button", { name: copy.delete, exact: true }).click();
  await page.getByRole("button", { name: copy.confirmDelete, exact: true }).click();
  await expect(page.getByRole("button", { name: copy.makeVoiceTitle })).toBeVisible();
});
