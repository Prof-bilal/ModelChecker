import assert from "node:assert/strict";
import { test } from "node:test";
import { redactSecrets } from "./redact.js";

test("redacts a known credential everywhere in a string", () => {
  const key = "sentinel-credential-do-not-leak";
  assert.equal(redactSecrets(`log ${key}; error=${key}`, [key]), "log [REDACTED]; error=[REDACTED]");
});
