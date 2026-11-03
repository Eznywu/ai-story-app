import assert from "node:assert/strict";
import { test } from "node:test";
import { generateStoryWithRetry } from "../lib/stories/storyGenerator";

process.env.STORY_LIBRARY_ANTIREPEAT = "0";

const input = { mainCharacterName: "Mia", genre: "Animals", length: "short", age: "4", language: "en" };

function failing(error: Error & { status?: number }) {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    complete: async () => {
      calls += 1;
      throw error;
    },
  };
}

test("a rejected request is not paid for twice", async () => {
  const provider = failing(Object.assign(new Error("Invalid request"), { status: 400 }));
  await assert.rejects(generateStoryWithRetry(input, { retries: 2, complete: provider.complete }), /Invalid request/);
  assert.equal(provider.calls, 1);
});

test("a provider outage is retried, then reported instead of returning a canned story", async () => {
  const provider = failing(new Error("fetch failed"));
  await assert.rejects(generateStoryWithRetry(input, { retries: 1, complete: provider.complete }), (error: unknown) => {
    assert.equal((error as { status?: number }).status, 503);
    assert.match(String((error as Error).message), /Nothing was saved/);
    return true;
  });
  assert.equal(provider.calls, 2);
});

test("a story without a visual brief gets one derived locally, with no second model call", async () => {
  let calls = 0;
  const story = await generateStoryWithRetry(input, {
    complete: async () => {
      calls += 1;
      return "Mia the little fox found a warm, quiet burrow under the old oak tree and fell asleep.";
    },
  });
  assert.equal(calls, 1);
  assert.match(story.text, /Mia the little fox/);
  assert.ok(story.visualBrief, "expected a derived visual brief");
});
