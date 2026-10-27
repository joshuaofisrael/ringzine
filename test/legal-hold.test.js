import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { checkPost, gatePostsDir, holdPost, sha256 } from "../lib/legal-hold.js";

const holdDir = "test/fixtures/hold-posts";
const passDir = "test/fixtures/pass-posts";

test("a risky post is held and a routine post passes", () => {
  const held = gatePostsDir(holdDir);
  assert.equal(held.ok, false);
  assert.ok(held.blocked[0].flags.some((f) => f.rule === 1));
  assert.equal(gatePostsDir(passDir).ok, true);
});

test("the live posts directory passes the gate", () => {
  const live = gatePostsDir("src/content/posts");
  assert.equal(live.ok, true, JSON.stringify(live.blocked));
});

test("holding writes a HOLD_REVIEW draft and one queue line, and only Joshua's exact approval releases it", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rz-hold-"));
  const posts = path.join(tmp, "posts");
  fs.mkdirSync(posts);
  const file = path.join(posts, "2026-10-27-test-hold.md");
  fs.copyFileSync(path.join(holdDir, "2026-10-27-test-hold.md"), file);
  const queue = path.join(tmp, "queue.jsonl");
  const { flags } = checkPost(fs.readFileSync(file, "utf8"));
  const entry = holdPost(file, { queueFile: queue, flags });
  assert.equal(entry.status, "HOLD_REVIEW");
  assert.equal(fs.readFileSync(queue, "utf8").trim().split("\n").length, 1);
  const raw = fs.readFileSync(file, "utf8");
  assert.match(raw, /draft: true/);
  assert.equal(gatePostsDir(posts, { root: tmp }).ok, true, "a held draft is not published");

  // Flip draft off without approval: blocked.
  fs.writeFileSync(file, raw.replace("draft: true", "draft: false"));
  const approvals = path.join(tmp, "approvals.jsonl");
  assert.equal(gatePostsDir(posts, { root: tmp, approvalsFile: approvals }).ok, false);
  // A bot approval does not count.
  const live = fs.readFileSync(file, "utf8");
  fs.writeFileSync(approvals, `${JSON.stringify({ site: "ringzine.com", file, sha256: sha256(live), approved_by: "Wrestling News Bot" })}\n`);
  assert.equal(gatePostsDir(posts, { root: tmp, approvalsFile: approvals }).ok, false);
  // Joshua's approval of a different version does not count.
  fs.writeFileSync(approvals, `${JSON.stringify({ site: "ringzine.com", file, sha256: sha256(`${live}x`), approved_by: "Joshua" })}\n`);
  assert.equal(gatePostsDir(posts, { root: tmp, approvalsFile: approvals }).ok, false);
  // Joshua's approval of this exact version releases it.
  fs.writeFileSync(approvals, `${JSON.stringify({ site: "ringzine.com", file, sha256: sha256(live), approved_by: "Joshua" })}\n`);
  assert.equal(gatePostsDir(posts, { root: tmp, approvalsFile: approvals }).ok, true);
});

test("an image without an Original licence record is held", () => {
  const raw = fs.readFileSync(path.join(passDir, "2026-10-27-test-pass.md"), "utf8").replace("raw-1026-hero", "unknown-photo");
  assert.ok(checkPost(raw, { images: {} }).flags.some((f) => f.rule === 3));
});
