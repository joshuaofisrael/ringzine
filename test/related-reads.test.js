import assert from "node:assert/strict";
import { test } from "node:test";
import { insertHtmlAfterParagraph, isExplainer, readsForPage } from "../lib/related-reads.js";

function post(url, { title, category = "WWE", tags = [], date = "2026-11-01", label = "" } = {}) {
  return { url, data: { title, category, tags, date, label } };
}

test("related reads prefer a shared tag over a newer story from the same desk", () => {
  const posts = [
    post("/articles/newer/", { title: "Newer Raw result", tags: ["Raw"], date: "2026-11-18" }),
    post("/articles/orton/", { title: "Orton follow up", tags: ["Randy Orton", "Crown Jewel"], date: "2026-11-07" }),
    post("/articles/rules/", {
      title: "How a WarGames match works",
      tags: ["WarGames", "match rules"],
      date: "2026-11-04",
      label: "analysis",
    }),
  ];
  const reads = readsForPage(posts, {
    url: "/articles/lms/",
    title: "How a WWE Last Man Standing match ends",
    category: "WWE",
    tags: ["Last Man Standing", "Randy Orton"],
    date: "2026-10-29",
    label: "analysis",
  });
  assert.equal(reads.explainer, true);
  assert.equal(reads.mid[0].url, "/articles/orton/");
  assert.equal(reads.background.length, 0);
  assert.equal(reads.compare[0].url, "/articles/rules/");
  assert.deepEqual(reads.followUps.map((item) => item.url), ["/articles/orton/"]);
});

test("news stories get a later follow up and an explainer for background", () => {
  const posts = [
    post("/articles/lms/", {
      title: "How a WWE Last Man Standing match ends",
      tags: ["Randy Orton", "match rules"],
      date: "2026-10-29",
      label: "analysis",
    }),
    post("/articles/result/", { title: "Rhodes beats Orton", tags: ["Randy Orton"], date: "2026-11-07" }),
    post("/articles/other/", { title: "Unrelated Raw", tags: ["Raw"], date: "2026-11-19" }),
  ];
  const reads = readsForPage(posts, {
    url: "/articles/preview/",
    title: "Crown Jewel preview",
    category: "WWE",
    tags: ["Randy Orton", "Crown Jewel"],
    date: "2026-10-28",
    label: "",
  });
  assert.equal(reads.explainer, false);
  assert.deepEqual(reads.followUps.map((item) => item.url), ["/articles/result/"]);
  assert.equal(reads.background[0].url, "/articles/lms/");
  assert.ok(reads.mid.some((item) => item.url === "/articles/result/"));
});

test("a loose one tag follow up drops out when a story shares two tags", () => {
  const posts = [
    post("/articles/close/", { title: "Orton result", tags: ["Randy Orton", "Crown Jewel"], date: "2026-11-07" }),
    post("/articles/loose/", { title: "Cody mentioned", tags: ["Cody Rhodes"], date: "2026-11-09" }),
  ];
  const reads = readsForPage(posts, {
    url: "/articles/lms/",
    title: "How a WWE Last Man Standing match ends",
    category: "WWE",
    tags: ["Cody Rhodes", "Randy Orton", "Crown Jewel"],
    date: "2026-10-29",
    label: "analysis",
  });
  assert.deepEqual(reads.followUps.map((item) => item.url), ["/articles/close/"]);
});

test("a title that starts with How counts as an explainer", () => {
  assert.equal(isExplainer({ data: { title: "How a WWE Battle Royal Works" } }), true);
  assert.equal(isExplainer({ data: { title: "NXT card and how to watch" } }), false);
});

test("the next read block lands after an early paragraph and stays off a one line story", () => {
  const block = '<section class="next-reads">Read next</section>';
  const long = "<p>One</p><p>Two</p><p>Three</p><p>Four</p><p>Five</p>";
  const placed = insertHtmlAfterParagraph(long, block);
  assert.match(placed, /Two<\/p>\n<section class="next-reads">/);
  assert.ok(placed.indexOf("Five") > placed.indexOf("next-reads"));
  const short = "<p>Only</p>";
  assert.match(insertHtmlAfterParagraph(short, block), /Only<\/p>\n<section/);
  assert.equal(insertHtmlAfterParagraph(long, "  "), long);
});
