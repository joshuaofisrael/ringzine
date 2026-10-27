import assert from "node:assert/strict";
import { test } from "node:test";
import {
  inlineCitationWarning,
  validateArticleImages,
  validateImageCredit,
  validatePostsDir,
  validatePublishedPost,
  validateSourceList,
} from "../lib/validate-posts.js";

const source = {
  title: "Raw results, Oct. 26, 2026",
  url: "https://www.wwe.com/shows/raw/2026-10-26/results",
  publisher: "WWE",
  date: "2026-10-26",
};
const hero = {
  src: "raw-1026-hero",
  alt: "Dark RingZine title card reading Raw results above ring ropes",
  width: 1280,
  height: 720,
};

test("published articles need a complete sources list", () => {
  assert.ok(validateSourceList(undefined).length);
  assert.ok(validateSourceList([]).length);
  assert.match(validateSourceList([{ ...source, publisher: "" }]).join(" "), /publisher/);
  assert.ok(validateSourceList([{ ...source, url: "notaurl" }]).some((m) => m.includes("url")));
  assert.deepEqual(validateSourceList([source]), []);
});

test("every published story needs a Confirmed or Rumor status", () => {
  const base = {
    title: "A sourced headline",
    date: "2026-10-27",
    updatedAt: "2026-10-27",
    category: "WWE",
    summary: "A dek.",
    sources: [source],
    hero,
  };
  assert.deepEqual(validatePublishedPost({ ...base, status: "confirmed" }), []);
  assert.deepEqual(validatePublishedPost({ ...base, status: "rumor" }), []);
  assert.match(validatePublishedPost(base).join(" "), /status is required/);
  assert.match(validatePublishedPost({ ...base, status: "maybe" }).join(" "), /status is required/);
  assert.match(validatePublishedPost({ ...base, status: "rumor", category: "Cars" }).join(" "), /category/);
});

test("drafts and complete posts follow the publish gate", () => {
  assert.equal(validatePostsDir("test/fixtures/draft-posts").ok, true);
  const ready = validatePostsDir("test/fixtures/valid-posts");
  assert.equal(ready.ok, true, JSON.stringify(ready.errors));
  assert.equal(ready.warnings.length, 1);
  const missing = validatePostsDir("test/fixtures/invalid-posts");
  assert.equal(missing.ok, false);
  assert.match(missing.errors[0].messages.join(" "), /sources/);
  const sample = validatePostsDir("test/fixtures/sample-unlocked");
  assert.equal(sample.ok, false);
  assert.match(sample.errors[0].messages.join(" "), /sample/);
  const posts = validatePostsDir("src/content/posts");
  assert.equal(posts.ok, true, JSON.stringify(posts.errors));
  assert.deepEqual(posts.warnings, []);
});

test("a published story needs a described local hero; body images are optional", () => {
  assert.deepEqual(validateArticleImages({ hero }), []);
  assert.match(validateArticleImages({}).join(" "), /hero is required/);
  assert.match(validateArticleImages({ hero: { ...hero, alt: "card" } }).join(" "), /meaningful/);
  assert.match(validateArticleImages({ hero: { ...hero, src: "https://x.test/a.jpg" } }).join(" "), /basename/);
  assert.match(validateArticleImages({ hero: { ...hero, src: "missing-art" } }).join(" "), /missing/);
  assert.match(validateArticleImages({ hero, images: "nope" }).join(" "), /list/);
});

test("a press image needs credit and cannot be a stock agency file", () => {
  const ready = {
    image: "raw-1026-hero",
    imageAlt: "Dark RingZine title card used only as a validator fixture",
    imageCaption: "Fixture.",
    imageCredit: "RingZine",
    imageLicense: "Original",
    imageWidth: 1280,
    imageHeight: 720,
  };
  assert.deepEqual(validateImageCredit(ready), []);
  assert.match(validateImageCredit({ ...ready, imageLicense: "CC-BY", imageSource: "" }).join(" "), /imageSource/);
  assert.match(
    validateImageCredit({ ...ready, imageLicense: "CC0", imageSource: "https://www.shutterstock.com/x", imageWidth: 640, imageHeight: 360 }).join(" "),
    /stock/,
  );
});

test("inline citation warning", () => {
  assert.ok(inlineCitationWarning("No links here."));
  assert.equal(inlineCitationWarning("[WWE](https://www.wwe.com/)"), null);
});
