import assert from "node:assert/strict";
import { test } from "node:test";
import { authorizeCron } from "../lib/auth/cron";

function request(headers: Record<string, string>) {
  return new Request("https://example.test/api/cron/daily-stories", { headers });
}

test("cron routes stay closed without a configured secret", () => {
  delete process.env.CRON_SECRET;
  assert.equal(authorizeCron(request({ authorization: "Bearer " })), false);
});

test("cron routes accept only the configured secret", () => {
  process.env.CRON_SECRET = "s3cret";
  assert.equal(authorizeCron(request({ authorization: "Bearer s3cret" })), true);
  assert.equal(authorizeCron(request({ "x-cron-secret": "s3cret" })), true);
  assert.equal(authorizeCron(request({ authorization: "Bearer s3cre" })), false);
  assert.equal(authorizeCron(request({ authorization: "s3cret" })), false);
  assert.equal(authorizeCron(request({})), false);
  delete process.env.CRON_SECRET;
});
