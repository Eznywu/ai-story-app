import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const outDir = "/opt/cursor/artifacts/screenshots";

test.beforeAll(() => {
  fs.mkdirSync(outDir, { recursive: true });
});

test("MOCK local test parent records a voice and sees it under My voices", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const session = await page.request.get("/api/auth/session");
  expect(session.ok()).toBeTruthy();
  const body = (await session.json()) as { user?: { id?: string; email?: string }; authEnabled?: boolean; localTestParent?: boolean };
  expect(body.localTestParent).toBe(true);
  expect(body.authEnabled).toBe(false);
  expect(body.user?.email).toBe("local-test-parent@local.invalid");

  await page.context().addCookies([{ name: "hh_ui_locale", value: "en", url: "http://127.0.0.1:3457" }]);
  await page.addInitScript((id) => {
    localStorage.setItem("hh_ui_locale", "en");
    localStorage.setItem(
      `emrsy.onboarding.v1.${id}`,
      JSON.stringify({ completed: true, selectedIntent: null, consentedToVoice: false })
    );
    document.documentElement.dataset.hhVoiceMock = "1";
    (window as unknown as { __HH_VOICE_TEST?: unknown }).__HH_VOICE_TEST = {
      voicedMs: 65_000,
      clipped: false,
      durationMs: 15_000,
    };
  }, body.user?.id);

  await page.goto("/?tab=create");
  await expect(page.getByText("Local test parent")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
  const voiceAccess = await page.evaluate(async () => {
    const response = await fetch("/api/voices?language=en", { cache: "no-store" });
    const data = (await response.json()) as { personalVoices?: string; localTestParent?: boolean };
    return { status: response.status, personalVoices: data.personalVoices, localTestParent: data.localTestParent };
  });
  expect(voiceAccess).toEqual({ status: 200, personalVoices: "available", localTestParent: true });
  const existing = await page.request.get("/api/voices?language=en");
  const existingBody = (await existing.json()) as { voices?: { id?: string; kind?: string }[] };
  for (const voice of existingBody.voices || []) {
    if (voice.kind === "personal" && voice.id) {
      await page.request.delete(`/api/voices/${encodeURIComponent(voice.id)}`, {
        data: { deleteGeneratedAudio: false },
      });
    }
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "Create a story" })).toBeVisible();
  await page.getByRole("button", { name: /Read by/ }).click();
  await expect(page.getByRole("heading", { name: "My voices" })).toBeVisible();
  await page.getByRole("button", { name: "Add my voice" }).click();
  await page.getByRole("checkbox", { name: "I agree" }).check();
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.getByRole("button", { name: "Allow microphone" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await page.waitForTimeout(12_000);
  await page.screenshot({ path: path.join(outDir, "MOCK-local-parent-recorder-390x844.png") });
  await page.evaluate(() => {
    document.documentElement.dataset.hhVoiceMock = "1";
    (window as unknown as { __HH_VOICE_TEST?: unknown }).__HH_VOICE_TEST = {
      voicedMs: 65_000,
      clipped: false,
      durationMs: 15_000,
    };
  });
  await page.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByRole("button", { name: "Create a voice from this take" })).toBeEnabled();
  await page.getByRole("button", { name: "Create a voice from this take" }).click();
  await expect(page.getByRole("heading", { name: "Hear a short preview" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Next, name it" }).click();
  await page.getByRole("button", { name: "Save and use" }).click();
  const mine = page.getByRole("option", { name: /My voice/ }).first();
  await expect(mine).toBeVisible();
  await expect(mine.getByText("Test voice")).toBeVisible();
  await mine.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(outDir, "MOCK-local-parent-my-voices-390x844.png") });
});
