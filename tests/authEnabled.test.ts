import assert from "node:assert/strict";
import test from "node:test";
import { authEnabled } from "../lib/auth/config.ts";

const original = process.env.AUTH_ENABLED;

test.after(() => {
  if (original === undefined) delete process.env.AUTH_ENABLED;
  else process.env.AUTH_ENABLED = original;
});

test("email sign-in stays off unless AUTH_ENABLED is an explicit on value", () => {
  for (const value of [undefined, "", "false", "0", "off", "no", "FALSE"]) {
    if (value === undefined) delete process.env.AUTH_ENABLED;
    else process.env.AUTH_ENABLED = value;
    assert.equal(authEnabled(), false, `expected off for ${String(value)}`);
  }
  for (const value of ["true", "TRUE", "1", "yes", "on", "email", "  true  "]) {
    process.env.AUTH_ENABLED = value;
    assert.equal(authEnabled(), true, `expected on for ${value}`);
  }
});
