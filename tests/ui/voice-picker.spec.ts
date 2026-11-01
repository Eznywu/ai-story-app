import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const outDir = "/opt/cursor/artifacts/screenshots";

const stories = [
  { id: "story-grandpa", name: "Grandpa", description: "Gentle and reassuring. A friendly grandpa for quiet adventures.", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true, isDefault: true },
  { id: "story-sunny", name: "Sunny", description: "Warm and conversational. A natural voice, as if someone is sitting nearby.", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-cedar", name: "Cedar", description: "Calm with a lower voice. Deep and smooth for a bedtime listen.", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-leo", name: "Leo", description: "Bright and expressive. Animated storytelling without turning into a cartoon.", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-nia", name: "Nia", description: "Classic storyteller. A warm voice that carries a whole tale.", languages: ["en"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-nuan", name: "暖暖", description: "溫柔而安心。台灣國語，語速輕、不著急。", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true, isDefault: true },
  { id: "story-chun", name: "阿春", description: "溫暖、像在聊天。自然的台灣國語。", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-yu", name: "小宇", description: "明亮、有精神。年輕的台灣國語。", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-anna", name: "安娜", description: "明亮、有表情。友善的台灣國語。", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-coco", name: "可可", description: "經典說書人。友善的台灣國語，清楚好懂。", languages: ["zh-Hant"], group: "story", kind: "default", status: "ready", selectable: true },
  { id: "story-sunny-zh", name: "桑尼", description: "溫暖、像在聊天。聲音自然，像有人坐在旁邊說故事。", languages: ["zh-Hant"], group: "story", kind: "default", status: "pending_audition", selectable: false, nonNativeRisk: true },
];

function voicesFor(language: string, mine: unknown[] = []) {
  const zh = language.toLowerCase().startsWith("zh");
  const story = stories.filter((voice) => voice.languages.some((item) => (zh ? item.startsWith("zh") : item === "en")));
  return {
    personalVoices: "available",
    authEnabled: true,
    voiceLimit: 2,
    voices: [...story, ...mine],
  };
}

async function installRoutes(page: Page, mine: unknown[] = []) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: { user: { id: "user-test", email: "parent@example.com" }, authEnabled: true } })
  );
  await page.route("**/api/voices**", (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const language = new URL(route.request().url()).searchParams.get("language") || "en";
    return route.fulfill({ json: voicesFor(language, mine) });
  });
  await page.route("**/api/stories**", (route) => route.fulfill({ json: { stories: [] } }));
  await page.route("**/api/kids**", (route) => route.fulfill({ json: { kids: [] } }));
  await page.route("**/api/characters**", (route) => route.fulfill({ json: { characters: [] } }));
  await page.route("**/api/reading-stats**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/voice-preference**", (route) => route.fulfill({ json: { storedOnServer: true, voiceId: "story-grandpa", language: "en" } }));
  await page.route("**/api/voice-preview**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      headers: { "X-Preview-Cache": "hit", "X-Preview-Source": "mock" },
      body: Buffer.from("SUQz", "base64"),
    })
  );
}

async function openCreate(page: Page, language: "en" | "zh-Hant", name: string) {
  await page.addInitScript(
    ({ language, name }) => {
      localStorage.setItem(
        "emrsy.onboarding.v1.user-test",
        JSON.stringify({ completed: true, selectedIntent: null, consentedToVoice: false })
      );
      localStorage.setItem(
        "happy-horse.createDraft.v1",
        JSON.stringify({
          age: language === "zh-Hant" ? "4 歲" : "4 years",
          language,
          mainCharacterName: name,
          childGender: "any",
          genre: "Animals",
          length: "short",
          storyInput: "",
          theme: "",
          mood: "",
          seriesMode: "one_shot",
          educationalGoal: "",
          moralLesson: "",
          selectedVoiceId: language === "en" ? "story-grandpa" : "story-nuan",
        })
      );
    },
    { language, name }
  );
  await page.goto("/?tab=create");
  await expect(page.getByRole("heading", { name: language === "en" ? "Create a story" : "寫一個故事" })).toBeVisible();
  await expect(page.getByText(name)).toBeVisible();
}

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

test("MOCK signed-in voice flow in English at 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const pending = {
    id: "v_dad",
    name: "Dad",
    description: "My voice",
    language: "en",
    languages: ["en"],
    group: "mine",
    kind: "personal",
    status: "pending_verification",
    selectable: false,
  };
  await installRoutes(page, [pending]);
  await openCreate(page, "en", "Lulu");
  await expect(page.getByRole("button", { name: /For Lulu/ })).toBeVisible();
  await page.getByRole("button", { name: /Read by/ }).click();
  await expect(page.getByRole("heading", { name: "Story voices" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "My voices" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add my voice" })).toBeVisible();
  await expect(page.getByText("Waiting for verification. Not ready to select.")).toBeVisible();
  await page.getByRole("button", { name: "Add my voice" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outDir, "MOCK-picker-en-390x844.png") });

  await page.getByRole("button", { name: "Add my voice" }).click();
  const start = page.getByRole("button", { name: "Start recording" });
  await expect(start).toBeDisabled();
  await page.screenshot({ path: path.join(outDir, "MOCK-consent-en-390x844.png") });
  await page.getByRole("checkbox", { name: "I agree" }).check();
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByRole("heading", { name: "Next, the microphone" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-mic-permission-en-390x844.png") });

  await page.addInitScript(() => {
    document.documentElement.dataset.hhVoiceMock = "1";
  });
  await page.evaluate(() => {
    document.documentElement.dataset.hhVoiceMock = "1";
    (window as unknown as { __HH_VOICE_TEST?: unknown }).__HH_VOICE_TEST = {
      voicedMs: 1000,
      clipped: false,
      durationMs: 4000,
    };
  });
  await page.getByRole("button", { name: "Allow microphone" }).click();
  await expect(page.getByText("Aim for 60 to 120 seconds")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-recording-en-390x844.png") });
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText("There was not enough speech")).toBeVisible();
  await expect(page.getByText("A little short")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-silence-short-en-390x844.png") });

  await page.evaluate(() => {
    (window as unknown as { __HH_VOICE_TEST?: unknown }).__HH_VOICE_TEST = {
      voicedMs: 20000,
      clipped: true,
      durationMs: 20000,
    };
  });
  await page.getByRole("button", { name: "Record again" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText("too loud and clipped")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-clipping-en-390x844.png") });

  await page.evaluate(() => {
    (window as unknown as { __HH_VOICE_TEST?: unknown }).__HH_VOICE_TEST = {
      voicedMs: 65000,
      clipped: false,
      durationMs: 70000,
    };
  });
  await page.getByRole("button", { name: "Record again" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Create a voice from this take" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Discard" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-listen-rerecord-discard-en-390x844.png") });

  let releaseClone: (value: { selectable: boolean }) => void = () => {};
  const gate = new Promise<{ selectable: boolean }>((resolve) => {
    releaseClone = resolve;
  });
  await page.route("**/api/voice-clone", async (route) => {
    const choice = await gate;
    await route.fulfill({
      json: { voice: { id: "v_mom", name: "Mom", selectable: choice.selectable, status: choice.selectable ? "ready" : "pending_verification" } },
    });
  });
  await page.getByRole("button", { name: "Create a voice from this take" }).click();
  await expect(page.getByRole("button", { name: "Creating your voice…" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-creating-en-390x844.png") });
  releaseClone({ selectable: true });
  await expect(page.getByRole("heading", { name: "Hear a short preview" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-preview-narration-en-390x844.png") });
  await page.getByRole("button", { name: "Next, name it" }).click();
  await expect(page.getByRole("button", { name: "Save and use" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-name-save-en-390x844.png") });

  await page.unroute("**/api/voices**");
  await page.route("**/api/voices**", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({
        json: voicesFor("en", [
          pending,
          { id: "v_mom", name: "Mom", description: "My voice", language: "en", languages: ["en"], group: "mine", kind: "personal", status: "ready", selectable: true },
        ]),
      });
    }
    return route.fulfill({ json: { voice: { id: "v_mom", name: "Mom" } } });
  });
  await page.getByRole("button", { name: "Save and use" }).click();
  await expect(page.getByRole("option", { name: /Mom/ })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-selected-personal-en-390x844.png") });
  await page.getByRole("button", { name: "Rename" }).first().click();
  await expect(page.getByRole("button", { name: "Save name" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-rename-en-390x844.png") });
  await page.getByRole("button", { name: "Delete", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: "Delete this voice?" })).toBeVisible();
  await expect(page.getByText("Story text stays")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-delete-confirm-en-390x844.png") });
});

test("MOCK mic denied and provider retry at 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRoutes(page);
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new Error("denied"));
  });
  await openCreate(page, "en", "Lulu");
  await page.getByRole("button", { name: /Read by/ }).click();
  await page.getByRole("button", { name: "Add my voice" }).click();
  await page.getByRole("checkbox", { name: "I agree" }).check();
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Allow microphone" }).click();
  await expect(page.getByText("The microphone is blocked")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-mic-denied-en-390x844.png") });

  await page.addInitScript(() => {
    document.documentElement.dataset.hhVoiceMock = "1";
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      osc.connect(dest);
      osc.start();
      return dest.stream;
    };
  });
  await page.evaluate(async () => {
    document.documentElement.dataset.hhVoiceMock = "1";
    (window as unknown as { __HH_VOICE_TEST?: unknown }).__HH_VOICE_TEST = { voicedMs: 65000, clipped: false, durationMs: 70000 };
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    osc.connect(dest);
    osc.start();
    navigator.mediaDevices.getUserMedia = async () => dest.stream;
  });
  await page.route("**/api/voice-clone", (route) => route.fulfill({ status: 502, json: { error: "The voice service could not create a voice." } }));
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Create a voice from this take" }).click();
  await expect(page.getByText("could not create a voice")).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-provider-failure-en-390x844.png") });
});

test("MOCK verification pending voice is not selectable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installRoutes(page, [
    { id: "v_dad", name: "Dad", description: "My voice", language: "en", languages: ["en"], group: "mine", kind: "personal", status: "pending_verification", selectable: false },
  ]);
  await openCreate(page, "en", "Lulu");
  await page.getByRole("button", { name: /Read by/ }).click();
  const dad = page.getByRole("option", { name: /Dad/ });
  await expect(dad).toBeDisabled();
  await expect(page.getByText("Waiting for verification. Not ready to select.")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-verification-pending-en-390x844.png") });
});

test("MOCK Traditional Chinese picker and recording at 375x667", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await installRoutes(page);
  await openCreate(page, "zh-Hant", "嚕嚕");
  await expect(page.getByRole("button", { name: /給誰聽 嚕嚕/ })).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-child-name-zh-375x667.png") });
  await page.getByRole("button", { name: /誰來念/ }).click();
  await expect(page.getByRole("heading", { name: "故事聲音" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "我的聲音" })).toBeVisible();
  await expect(page.getByRole("button", { name: "加入我的聲音" })).toBeVisible();
  await expect(page.getByRole("button", { name: "關閉" })).toBeVisible();
  await expect(page.getByText("溫柔而安心")).toBeVisible();
  await expect(page.getByText("尚未試聽")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-picker-zh-375x667.png") });
  await page.getByRole("button", { name: "加入我的聲音" }).click();
  await page.getByRole("checkbox", { name: "我同意" }).check();
  await page.getByRole("button", { name: "開始錄音" }).click();
  await page.evaluate(() => {
    document.documentElement.dataset.hhVoiceMock = "1";
    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    const osc = ctx.createOscillator();
    osc.connect(dest);
    osc.start();
    navigator.mediaDevices.getUserMedia = async () => dest.stream;
  });
  await page.getByRole("button", { name: "允許麥克風" }).click();
  await expect(page.getByText("目標是 60 到 120 秒")).toBeVisible();
  await page.screenshot({ path: path.join(outDir, "MOCK-recording-zh-375x667.png") });
});
