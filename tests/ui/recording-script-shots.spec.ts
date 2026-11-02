import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { getMessages } from "../../lib/i18n/catalog";
import { INTERFACE_LOCALES, type InterfaceLocale } from "../../lib/i18n/locales";

const ORIGIN = "http://127.0.0.1:3457";
const phase = process.env.AB18_SHOT_PHASE || "after";
const outDir = process.env.AB18_SHOT_DIR || path.join("/opt/cursor/artifacts/screenshots", `ab18-${phase}`);

const SHOTS: { locale: InterfaceLocale; story: "en" | "zh-Hant" }[] = [
  { locale: "en", story: "en" },
  { locale: "zh-Hant", story: "zh-Hant" },
  { locale: "zh-Hans", story: "zh-Hant" },
  { locale: "ar", story: "en" },
  { locale: "ja", story: "en" },
  { locale: "hi", story: "en" },
  { locale: "ru", story: "en" },
];

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

async function boot(page: Page) {
  const session = await page.request.get("/api/auth/session");
  expect(session.ok()).toBeTruthy();
  const body = (await session.json()) as { user?: { id?: string } };
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
      voicedMs: 65_000,
      clipped: false,
      durationMs: 70_000,
    };
  }, body.user?.id || "");
  await page.goto("/?tab=create");
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
  const existing = await page.request.get("/api/voices?language=en");
  const listed = (await existing.json()) as { voices?: { id?: string; kind?: string }[] };
  for (const voice of listed.voices || []) {
    if (voice.kind === "personal" && voice.id) {
      await page.request.delete(`/api/voices/${encodeURIComponent(voice.id)}`, { data: { deleteGeneratedAudio: false } });
    }
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
}

test("recorder screenshots for the reading passage", async ({ page }) => {
  test.setTimeout(360_000);
  await boot(page);
  await expect
    .poll(async () => {
      return page.evaluate(async () => {
        const response = await fetch("/api/voices?language=en", { cache: "no-store" });
        const data = (await response.json()) as { personalVoices?: string };
        return data.personalVoices || "";
      });
    })
    .toBe("available");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    for (const shot of SHOTS) {
      const meta = INTERFACE_LOCALES.find((item) => item.code === shot.locale);
      if (!meta) throw new Error(shot.locale);
      const copy = getMessages(shot.locale).voice;
      await page.getByTestId("interface-language-button").click();
      await page.getByRole("radio", { name: meta.nativeName }).click();
      const story = page.getByRole("group", { name: copy.language });
      const storyButton = story.getByRole("button", { name: shot.story === "en" ? "English" : "中文" });
      if ((await storyButton.getAttribute("aria-pressed")) !== "true") await storyButton.click();
      await page.getByRole("button", { name: copy.makeVoiceTitle }).click();
      await page.getByRole("checkbox", { name: copy.agree }).check();
      await page.getByRole("button", { name: copy.record }).click();
      await page.getByRole("button", { name: copy.allowMic }).click();
      const passage = page.locator(".voiceFlow__passage");
      await expect(passage).toBeVisible();
      await page.locator("dialog.quietSheet .quietSheet__panel").evaluate((node) => {
        node.scrollTop = 0;
      });
      const suffix = `${shot.locale}-${viewport.width}x${viewport.height}`;
      await passage.screenshot({ path: path.join(outDir, `passage-${suffix}.png`) });
      await page.locator("dialog.quietSheet").screenshot({ path: path.join(outDir, `recorder-${suffix}.png`) });
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: copy.makeVoiceTitle })).toBeVisible();
    }
  }
});
