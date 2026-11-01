import { defineConfig, devices } from "@playwright/test";

const port = 3457;

const env: Record<string, string> = {};
for (const [key, value] of Object.entries(process.env)) {
  if (typeof value === "string" && key !== "VERCEL_ENV" && key !== "MOCK_PROVIDERS") env[key] = value;
}
env.LOCAL_TEST_PARENT = "1";
env.NODE_ENV = "development";
env.AUTH_ENABLED = "";
env.DATABASE_URL = "postgresql://audiobook:audiobook@127.0.0.1:5432/audiobook";
env.ELEVENLABS_API_KEY = "local-test-key-must-not-be-used";

export default defineConfig({
  testDir: "tests/ui",
  testMatch: "**/local-parent.spec.ts",
  timeout: 90_000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "off",
  },
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env,
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
