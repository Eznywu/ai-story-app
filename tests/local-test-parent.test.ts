import assert from "node:assert/strict";
import test from "node:test";
import { localTestParentEnabled } from "../lib/auth/config.ts";
import { isReservedLoginEmail } from "../lib/auth/config.ts";
import { voiceProviderFromEnv } from "../lib/voices/provider.ts";

const saved = {
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
  LOCAL_TEST_PARENT: process.env.LOCAL_TEST_PARENT,
  AUTH_ENABLED: process.env.AUTH_ENABLED,
};

function restore() {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test.after(restore);

test("local test parent is off unless every local condition holds", () => {
  const base = { NODE_ENV: "development", LOCAL_TEST_PARENT: "1" } as NodeJS.ProcessEnv;
  assert.equal(localTestParentEnabled(base), true);
  assert.equal(localTestParentEnabled({ ...base, LOCAL_TEST_PARENT: "true" }), true);
  assert.equal(localTestParentEnabled({ ...base, LOCAL_TEST_PARENT: "yes" }), true);
  assert.equal(localTestParentEnabled({ ...base, LOCAL_TEST_PARENT: "on" }), true);

  for (const value of [undefined, "", "false", "0", "no", "off"]) {
    assert.equal(localTestParentEnabled({ ...base, LOCAL_TEST_PARENT: value }), false, `unset-like ${String(value)}`);
  }

  for (const vercel of ["production", "preview", "development", "0", "false"]) {
    assert.equal(localTestParentEnabled({ ...base, VERCEL_ENV: vercel }), false, `VERCEL_ENV=${vercel}`);
  }

  assert.equal(localTestParentEnabled({ ...base, NODE_ENV: "production" }), false);
  assert.equal(localTestParentEnabled({ ...base, NODE_ENV: "test", VERCEL_ENV: "preview" }), false);
});

test("the local test parent email cannot be used to sign in", () => {
  assert.equal(isReservedLoginEmail("guest@local.invalid"), true);
  assert.equal(isReservedLoginEmail("local-test-parent@local.invalid"), true);
  assert.equal(isReservedLoginEmail("LOCAL-TEST-PARENT@local.invalid"), true);
  assert.equal(isReservedLoginEmail("parent@example.com"), false);
});

test("local test parent forces the mock voice provider even when a key is set", async () => {
  const provider = voiceProviderFromEnv({
    NODE_ENV: "development",
    LOCAL_TEST_PARENT: "1",
    ELEVENLABS_API_KEY: "sk-live-should-not-be-used",
  });
  const created = await provider.createClone({
    name: "Mom",
    bytes: new Uint8Array([1, 2, 3]),
    filename: "take.webm",
    contentType: "audio/webm",
  });
  assert.match(created.providerVoiceId, /^mock_local_/);
  assert.equal(created.requiresVerification, false);

  const blocked = voiceProviderFromEnv({
    NODE_ENV: "production",
    LOCAL_TEST_PARENT: "1",
    ELEVENLABS_API_KEY: "",
  });
  await assert.rejects(() =>
    blocked.createClone({
      name: "Mom",
      bytes: new Uint8Array([1]),
      filename: "take.webm",
      contentType: "audio/webm",
    })
  );
});
