import { test } from "node:test";
import assert from "node:assert";
import { isModerateCleared, sha256 } from "../lib/legal-hold.js";

test("moderate flags clear only with a SAFE record for the exact version", () => {
  const raw = "post";
  const mod = [{ rule: 4, severity: "moderate" }];
  const ok = [{ site: "ringzine.com", sha256: sha256(raw), chatgpt_verdict: "SAFE (round 1)" }];
  assert.equal(isModerateCleared(raw, mod, ok), true);
  assert.equal(isModerateCleared("edited", mod, ok), false);
  assert.equal(isModerateCleared(raw, [{ rule: 2, severity: "high" }], ok), false);
  assert.equal(isModerateCleared(raw, mod, [{ ...ok[0], chatgpt_verdict: "UNSURE" }]), false);
});
