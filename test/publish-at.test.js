import assert from "node:assert/strict";
import { test } from "node:test";
import { isPendingPublication } from "../lib/dates.js";

const eleven = Date.parse("2026-10-29T11:00:00Z");
const three = Date.parse("2026-10-29T15:00:00Z");
const seven = Date.parse("2026-10-29T19:00:00Z");

test("publishAt hides a story until the UTC time and then lets it go", () => {
  assert.equal(isPendingPublication("2026-10-29T11:00:00Z", eleven - 1), true);
  assert.equal(isPendingPublication("2026-10-29T11:00:00Z", eleven), false);
  assert.equal(isPendingPublication("2026-10-29T15:00:00Z", eleven), true);
  assert.equal(isPendingPublication("2026-10-29T19:00:00Z", three), true);
  assert.equal(isPendingPublication("2026-10-29T19:00:00Z", seven), false);
  assert.equal(isPendingPublication(undefined, eleven), false);
  assert.equal(isPendingPublication("", eleven), false);
});
