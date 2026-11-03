import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const outDir = process.env.UI_SCREENSHOT_DIR || "/opt/cursor/artifacts/screenshots";

const stories = [
  { id: "story-grandpa", name: "Grandpa", description: "Gentle and reassuring.", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true, isDefault: true },
  { id: "story-nuan", name: "暖暖", description: "溫柔而安心。", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true, isDefault: true },
];

async function installRoutes(page: Page) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { user: { id: "user-test", email: "parent@example.com" }, authEnabled: true } })
  );
  await page.route("**/api/voices**", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const language = new URL(route.request().url()).searchParams.get("language") || "en";
    const zh = language.toLowerCase().startsWith("zh");
    return route.fulfill({
      json: {
        personalVoices: "available",
        authEnabled: true,
        voiceLimit: 2,
        voices: stories.filter((voice) => voice.languages.some((item) => (zh ? item.startsWith("zh") : item === "en"))),
      },
    });
  });
  await page.route("**/api/stories**", (route) => route.fulfill({ json: { stories: [] } }));
  await page.route("**/api/kids**", (route) => route.fulfill({ json: { kids: [] } }));
  await page.route("**/api/characters**", (route) => route.fulfill({ json: { characters: [] } }));
  await page.route("**/api/reading-stats**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/voice-preference**", (route) =>
    route.fulfill({ json: { storedOnServer: true, voiceId: "story-grandpa", language: "en" } })
  );
}

async function openTab(page: Page, tab: string, locale: string) {
  await page.context().addCookies([{ name: "hh_ui_locale", value: locale, url: "http://127.0.0.1:3456" }]);
  await page.addInitScript((code) => {
    localStorage.setItem("hh_ui_locale", code);
    localStorage.setItem(
      "emrsy.onboarding.v1.user-test",
      JSON.stringify({ completed: true, selectedIntent: null, consentedToVoice: false })
    );
    localStorage.setItem(
      "happy-horse.createDraft.v1",
      JSON.stringify({
        age: "4 years",
        language: "en",
        mainCharacterName: "Lulu",
        childGender: "any",
        genre: "Animals",
        length: "short",
        storyInput: "moon picnic",
        theme: "",
        mood: "",
        seriesMode: "one_shot",
        educationalGoal: "",
        moralLesson: "",
        selectedVoiceId: "story-grandpa",
      })
    );
  }, locale);
  await page.goto(`/?tab=${tab}`);
}

test("welcome screen keeps the language button clear of the logo", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await installRoutes(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Happy Horse" })).toBeVisible();
  const button = page.locator(".welcome").getByTestId("interface-language-button");
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(375);
});

const storyRecord = {
  id: "story-1",
  title: "The Little Lantern",
  genre: "Animals",
  length: "short",
  text: "The little horse walked home under a thin moon.",
  age: "4 years",
  language: "en",
  mainCharacterName: "Lulu",
  posterUrl: "/brand/icon-192.png",
  coverUrl: "/brand/icon-192.png",
  illustrationUrl: "/brand/icon-192.png",
  artworkStatus: "illustrated",
  posterCaption: "A quiet meadow",
  dedication: "For Lulu",
  audioUrl: null,
};

async function openStory(page: Page, locale: string) {
  await installRoutes(page);
  await page.route("**/api/stories/story-1", (route) => route.fulfill({ json: { story: storyRecord } }));
  await page.context().addCookies([{ name: "hh_ui_locale", value: locale, url: "http://127.0.0.1:3456" }]);
  await page.addInitScript((code) => {
    localStorage.setItem("hh_ui_locale", code);
    localStorage.setItem(
      "emrsy.onboarding.v1.user-test",
      JSON.stringify({ completed: true, selectedIntent: null, consentedToVoice: false })
    );
  }, locale);
  await page.goto("/story/story-1");
}

test("MOCK story reader in Japanese and poster card in Spanish", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStory(page, "ja");
  await expect(page.getByRole("button", { name: "読み聞かせを準備" })).toBeVisible();
  await expect(page.getByRole("link", { name: "わたしの物語" })).toBeVisible();
  await page.getByRole("button", { name: "読み聞かせを準備" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outDir, "MOCK-story-reader-ja-390x844.png") });

  await openStory(page, "es");
  const save = page.getByRole("button", { name: "Guardar mi póster" }).first();
  await expect(save).toBeVisible();
  await save.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outDir, "MOCK-poster-card-es-390x844.png") });
});

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

test("language control is on every primary screen and survives reload", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRoutes(page);
  await openTab(page, "home", "en");
  const button = page.getByTestId("interface-language-button");
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await expect(button).toHaveAttribute("aria-label", "Language");
  await page.screenshot({ path: path.join(outDir, "header-language-en-390x844.png") });

  await button.click();
  await expect(page.getByRole("radio", { name: "English" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "繁體中文" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "简体中文" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Español" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "हिन्दी" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "العربية" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Français" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Português" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Русский" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "日本語" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "language-sheet-en-390x844.png") });
  await page.getByRole("radio", { name: "Español" }).click();
  await expect(page.getByRole("heading", { name: "Tu primer cuento" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tu primer cuento" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");

  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await page.getByTestId("interface-language-button").click();
  await page.getByRole("radio", { name: "Français" }).click();
  await expect(page.getByRole("heading", { name: "Créer une histoire" })).toBeVisible();

  await page.getByRole("button", { name: "Histoires", exact: true }).click();
  await page.getByTestId("interface-language-button").click();
  await page.getByRole("radio", { name: "Português" }).click();
  await expect(page.getByRole("heading", { name: "Minhas histórias" })).toBeVisible();

  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByTestId("interface-language-button").click();
  await page.getByRole("radio", { name: "Русский" }).click();
  await expect(page.getByRole("heading", { name: "Профиль" })).toBeVisible();
});

test("Arabic keeps the create form and flips direction", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRoutes(page);
  await openTab(page, "create", "en");
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
  await expect(page.getByText("Lulu")).toBeVisible();
  await expect(page.locator("#personal-touch")).toHaveValue("moon picnic");
  await page.getByTestId("interface-language-button").click();
  await page.getByRole("radio", { name: "العربية" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { name: "اصنع قصة" })).toBeVisible();
  await expect(page.locator("#personal-touch")).toHaveValue("moon picnic");
  await expect(page.getByText("Lulu")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-create-ar-rtl-390x844.png") });
});

test("phone screenshots for Traditional and Simplified Chinese, Hindi, Japanese, and Russian", async ({ page }) => {
  await installRoutes(page);

  await page.setViewportSize({ width: 375, height: 667 });
  await openTab(page, "home", "zh-Hant");
  await expect(page.getByRole("heading", { name: "你的第一個故事" })).toBeVisible();
  await expect(page.getByTestId("interface-language-button")).toHaveAttribute("aria-label", "語言");
  await page.screenshot({ path: path.join(outDir, "home-zh-Hant-375x667.png") });

  await page.setViewportSize({ width: 375, height: 667 });
  await openTab(page, "home", "zh-Hans");
  await expect(page.getByRole("heading", { name: "你的第一个故事" })).toBeVisible();
  await expect(page.getByTestId("interface-language-button")).toHaveAttribute("aria-label", "语言");
  await page.screenshot({ path: path.join(outDir, "home-zh-Hans-375x667.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await openTab(page, "home", "hi");
  await expect(page.getByRole("heading", { name: "आपकी पहली कहानी" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "home-hi-390x844.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  await openTab(page, "home", "ja");
  await expect(page.getByRole("heading", { name: "はじめての物語" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "home-ja-390x844.png") });

  await page.setViewportSize({ width: 375, height: 667 });
  await openTab(page, "profile", "ru");
  await expect(page.getByRole("heading", { name: "Профиль" })).toBeVisible();
  await expect(page.getByText("parent@example.com")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-profile-ru-375x667.png") });
});
