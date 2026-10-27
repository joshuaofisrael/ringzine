import assert from "node:assert/strict";
import { test } from "node:test";
import faq, { faqAnswerText } from "../lib/faq.js";
import site from "../src/_data/site.js";
import { buildGraph, renderBreadcrumbNav } from "../lib/structured-data.js";

// The LLC may appear only as parentOrganization of the RingZine newsroom.
function nameOutsideParent(graph) {
  return JSON.stringify(graph, (key, value) => (key === "parentOrganization" ? undefined : value)).includes("Joshua");
}

test("NewsArticle publisher is RingZine and breadcrumbs escape text", () => {
  const graph = buildGraph(
    {
      kind: "article",
      title: "A sourced headline",
      summary: "A dek.",
      category: "WWE",
      tags: ["wwe-raw"],
      updatedAt: "2026-10-27",
      page: { url: "/articles/example/", date: new Date("2026-10-27T00:00:00Z") },
    },
    site,
  );
  const article = graph["@graph"].find((node) => node["@type"] === "NewsArticle");
  const newsroom = graph["@graph"].find((node) => node["@type"] === "NewsMediaOrganization");
  const crumbs = graph["@graph"].find((node) => node["@type"] === "BreadcrumbList");
  assert.equal(article.publisher["@id"], newsroom["@id"]);
  assert.equal(newsroom.name, "RingZine");
  assert.equal(article.author.name, "RingZine");
  assert.equal(article.copyrightHolder.name, "RingZine");
  assert.equal(nameOutsideParent(graph), false);
  assert.equal(JSON.stringify(graph).includes("PostalAddress"), false);
  assert.equal(article.dateModified, "2026-10-27T00:00:00.000Z");
  assert.equal(newsroom.parentOrganization?.name ?? "Joshua Israel Ventures LLC", "Joshua Israel Ventures LLC");
  assert.match(newsroom.publishingPrinciples, /\/sources-ethics\/$/);
  assert.equal(crumbs.itemListElement[0].name, "Home");
  assert.equal(crumbs.itemListElement[1].name, "WWE");
  assert.equal(crumbs.itemListElement[1].item, "https://ringzine.com/topics/wwe/");

  const desk = site.categories.find((category) => category.slug === "aew");
  const topic = buildGraph({ kind: "topic", hub: "topic", title: "AEW", summary: desk.hubIntro, desk, page: { url: "/topics/aew/" } }, site);
  const topicPage = topic["@graph"].find((node) => node["@type"] === "CollectionPage");
  assert.equal(topicPage.publisher.name, "RingZine");
  assert.equal(nameOutsideParent(topic), false);

  const home = buildGraph({ kind: "home", title: site.name, page: { url: "/" } }, site);
  const faqPage = home["@graph"].find((node) => node["@type"] === "FAQPage");
  assert.deepEqual(faqPage.mainEntity.map((item) => item.name), faq.map((item) => item.question));
  assert.deepEqual(faqPage.mainEntity.map((item) => item.acceptedAnswer.text), faq.map((item) => faqAnswerText(item)));
  assert.equal(home["@graph"].some((node) => node["@type"] === "NewsArticle"), false);

  const html = renderBreadcrumbNav([
    { name: "Home", url: "https://example.com/" },
    { name: "<script>", url: "https://example.com/x/" },
  ]);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
