import { defineConfig, devices } from "@playwright/test";

const port = 3456;
const databaseUrl = process.env.DATABASE_URL || "postgresql://audiobook:audiobook@127.0.0.1:5432/audiobook_test";
const database = new URL(databaseUrl);
if (!["localhost", "127.0.0.1"].includes(database.hostname) || !database.pathname.endsWith("_test")) {
  throw new Error("Browser tests require a disposable local DATABASE_URL ending in _test.");
}
process.env.DATABASE_URL = databaseUrl;

export default defineConfig({
  testDir: "tests/ui",
  testIgnore: ["**/recording-script-shots.spec.ts"],
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "off",
  },
  webServer: {
    command: `npx next start -H 127.0.0.1 -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      VERCEL_ENV: "preview",
      BLOB_READ_WRITE_TOKEN: "",
      OPENAI_API_KEY: "",
      ELEVENLABS_API_KEY: "",
      GEMINI_API_KEY: "",
      GOOGLE_API_KEY: "",
      GOOGLE_GENERATIVE_AI_API_KEY: "",
      RESEND_API_KEY: "",
      CRON_SECRET: "",
      VOICE_PREVIEW_LIVE: "",
      VOICE_PREVIEW_DAILY_CAP_USD: "",
      NARRATION_RETRY_APPROVED: "",
      NARRATION_RETRY_BUDGET_USD: "",
      MOCK_PROVIDERS: "1",
      AUTH_ENABLED: "1",
      AUTH_SECRET: "playwright-local-only",
      VOICE_CLONE_ATTEMPTS_PER_HOUR: "40",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
        },
      },
    },
  ],
});
