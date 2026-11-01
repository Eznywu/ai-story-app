import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const outDir = "/opt/cursor/artifacts/screenshots";

const storyVoices = [
  { id: "story-spuds", name: "Spuds", description: "Gentle and reassuring. A friendly grandpa for quiet adventures.", language: "en", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true, isDefault: true },
  { id: "story-mark", name: "Mark", description: "Warm and conversational. A natural voice, as if someone is sitting nearby.", language: "en", languages: ["en", "zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-david", name: "David", description: "Calm with a lower voice. Deep and smooth for a bedtime listen.", language: "en", languages: ["en", "zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-aaron", name: "Aaron", description: "Bright and expressive. Animated storytelling without turning into a cartoon.", language: "en", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-pastie", name: "Pastie", description: "Classic storyteller. A warm voice that carries a whole tale.", language: "en", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-tuntun", name: "Tun Tun", description: "溫柔而安心。台灣國語，語速輕、不著急。", language: "zh-Hant", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true, isDefault: true },
  { id: "story-chun", name: "Chun", description: "溫暖、像在聊天。自然的台灣國語。", language: "zh-Hant", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-jason", name: "Jason", description: "沉穩、聲音較低。適合安靜的夜晚。", language: "zh-Hant", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-anna", name: "Anna", description: "明亮、有表情。友善的台灣國語。", language: "zh-Hant", languages: ["en", "zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-james", name: "James", description: "經典說書人。平穩的中文，適合把故事講完。", language: "zh-Hant", languages: ["en", "zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
];

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { user: { id: "user-test", email: "parent@example.com" }, authEnabled: false } })
  );
  await page.route("**/api/voices?**", (route) =>
    route.fulfill({
      json: { personalVoices: "sign-in-required", authEnabled: false, voiceLimit: 2, voices: storyVoices },
    })
  );
  await page.route("**/api/voices", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({
      json: { personalVoices: "sign-in-required", authEnabled: false, voiceLimit: 2, voices: storyVoices },
    });
  });
  await page.route("**/api/stories**", (route) => route.fulfill({ json: { stories: [] } }));
  await page.route("**/api/kids**", (route) => route.fulfill({ json: { kids: [] } }));
  await page.route("**/api/characters**", (route) => route.fulfill({ json: { characters: [] } }));
  await page.route("**/api/reading-stats**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/voice-preference**", (route) => route.fulfill({ json: { preference: null, storedOnServer: false } }));
  await page.addInitScript(() => {
    localStorage.setItem(
      "emrsy.onboarding.v1.user-test",
      JSON.stringify({ completed: true, selectedIntent: null, consentedToVoice: false })
    );
  });
});

test("MOCK voice picker in English, Chinese, and the sign-in gate", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?tab=create");
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: /Read by/ }).click();
  await expect(page.getByRole("heading", { name: "Story voices" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Spuds/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add my voice" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-voice-picker-en-390x844.png") });

  await page.getByRole("button", { name: "Add my voice" }).click();
  await expect(page.getByRole("heading", { name: "A personal voice needs sign-in" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-add-voice-signin-390x844.png") });
  await page.getByRole("button", { name: "About sign-in" }).click();
  await page.getByRole("button", { name: "Close" }).click();

  await page.setViewportSize({ width: 375, height: 667 });
  await page.getByRole("button", { name: "中文", exact: true }).click();
  await page.getByRole("button", { name: /Read by/ }).click();
  await expect(page.getByRole("heading", { name: "故事聲音" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Tun Tun/ })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-voice-picker-zh-375x667.png") });
});

test("MOCK desktop picker and a denied microphone", async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/?tab=create");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: /Read by/ }).click();
  await expect(page.getByRole("option", { name: /Pastie/ })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-voice-picker-desktop-en.png") });

  await page.unroute("**/api/voices?**");
  await page.unroute("**/api/voices");
  await page.route("**/api/voices?**", (route) =>
    route.fulfill({
      json: {
        personalVoices: "available",
        authEnabled: true,
        voiceLimit: 2,
        voices: [
          ...storyVoices,
          {
            id: "v_pending",
            name: "Dad",
            description: "My voice",
            language: "en",
            languages: ["en"],
            group: "mine",
            kind: "personal",
            status: "pending_verification",
            selectable: false,
          },
        ],
      },
    })
  );
  await page.reload();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: /Read by/ }).click();
  await expect(page.getByText("Waiting for verification")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-voice-pending-390-desktop.png") });

  await context.clearPermissions();
  await page.getByRole("button", { name: "Add my voice" }).click();
  await page.getByRole("checkbox", { name: "I agree" }).check();
  await page.getByRole("button", { name: "Start recording" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-add-voice-mic-denied-en.png") });
});
