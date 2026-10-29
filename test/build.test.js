import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import matter from "gray-matter";
import { isPendingPublication } from "../lib/dates.js";

const root = path.resolve(import.meta.dirname, "..");
const bin = path.join(root, "node_modules", ".bin", "eleventy");
const LEGAL =
  "© 2026 Joshua Israel Ventures LLC. All rights reserved. RingZine is a trade name of Joshua Israel Ventures LLC, a Florida limited liability company.";
const LEGAL_PAGES = ["terms", "privacy", "disclaimer", "ad-disclosure", "copyright"];

function run(args, env) {
  const merged = { ...process.env, ...env };
  delete merged.PUBLISH_CLOCK;
  return spawnSync(bin, args, { cwd: root, encoding: "utf8", env: merged });
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}
function visible(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&");
}

test("RingZine production build", { timeout: 120000 }, () => {
  const failed = run(["--output=_site-invalid"], { ELEVENTY_ENV: "production", POSTS_DIR: "test/fixtures/invalid-posts" });
  fs.rmSync(path.join(root, "_site-invalid"), { recursive: true, force: true });
  assert.notEqual(failed.status, 0, "invalid posts must fail the build");
  assert.match(`${failed.stdout}\n${failed.stderr}`, /sources/i);

  fs.rmSync(path.join(root, "_site"), { recursive: true, force: true });
  const prod = run(["--output=_site"], { ELEVENTY_ENV: "production" });
  assert.equal(prod.status, 0, prod.stdout + prod.stderr);

  const out = path.join(root, "_site");
  const read = (f) => fs.readFileSync(path.join(out, f), "utf8");
  assert.equal(read("CNAME").trim(), "ringzine.com");
  assert.equal(fs.existsSync(path.join(out, "ads.txt")), false);

  const html = walk(out).filter((f) => f.endsWith(".html"));
  for (const file of html) {
    const rel = path.relative(out, file);
    const src = fs.readFileSync(file, "utf8");
    const text = visible(src);
    const legal = LEGAL_PAGES.some((p) => rel === `${p}/index.html`);
    assert.doesNotMatch(src, /adsbygoogle|pagead2|ca-pub-|ezoic|ezojs/i, `${rel} has ad code`);
    assert.doesNotMatch(src, /EV News|evnewsdesk|electric vehicle/i, `${rel} has EV leftovers`);
    assert.doesNotMatch(text, /[\u2013\u2014]/, `${rel} has a dash in visible copy`);
    assert.doesNotMatch(text, /\bSignal\b/, `${rel} uses Signal`);
    assert.doesNotMatch(text, /\b(London|United Kingdom|England|Britain)\b/, `${rel} names a non US location`);
    if (!legal) assert.doesNotMatch(text, /Joshua|Ventures LLC/, `${rel} shows the owner name`);
    if (legal) assert.ok(text.replace(/\s+/g, " ").includes(LEGAL), `${rel} is missing the legal line`);
    if (!legal) assert.doesNotMatch(text, /©|All rights reserved/, `${rel} has a copyright line`);
    if (src.includes("<head")) {
      assert.match(src, /window\.__mtmGaId\s*=\s*"G-6XNF3J2GZD"/, `${rel} missing GA id`);
      assert.match(src, /\/assets\/js\/consent\.js/, `${rel} missing consent script`);
      assert.doesNotMatch(src, /googletagmanager\.com\/gtag\/js\?id=/, `${rel} loads gtag before consent`);
      assert.match(src, /data-consent-open/, `${rel} missing cookie choices button`);
    }
  }

  const consent = read("assets/js/consent.js");
  for (const needle of ["mtm-consent", "mtm-analytics-consent", '"acc"', '"rej"', "data-consent-open", "denied", "granted"]) {
    assert.ok(consent.includes(needle) || consent.includes(needle.replace(/"/g, "'")), `consent.js missing ${needle}`);
  }

  const contact = read("contact/index.html");
  assert.match(contact, /action="https:\/\/formsubmit\.co\/4497ee41a1200e746e967998473d21da"/);
  assert.match(contact, /name="_next" value="https:\/\/ringzine\.com\/contact\/thanks\/"/);
  assert.ok(fs.existsSync(path.join(out, "contact/thanks/index.html")));

  const privacy = visible(read("privacy/index.html"));
  assert.match(privacy, /Google Analytics 4/);
  assert.match(visible(read("terms/index.html")), /Florida/);

  const postsDir = path.join(root, "src/content/posts");
  const posts = fs.readdirSync(postsDir).filter((n) => n.endsWith(".md"));
  assert.ok(posts.length >= 5);
  for (const name of posts) {
    const { data } = matter(fs.readFileSync(path.join(postsDir, name), "utf8"));
    if (data.draft === true) continue;
    const slug = name.replace(/\.md$/, "");
    if (isPendingPublication(data.publishAt)) {
      assert.equal(
        fs.existsSync(path.join(out, `articles/${slug}/index.html`)),
        false,
        `${name} is scheduled and must stay off the production build`,
      );
      assert.doesNotMatch(read("sitemap.xml"), new RegExp(slug));
      assert.doesNotMatch(read("feed.xml"), new RegExp(slug));
      continue;
    }
    const page = read(`articles/${slug}/index.html`);
    const label = data.status === "rumor" ? "Rumor" : "Confirmed";
    assert.match(page, new RegExp(`class="status-label status-${data.status}">${label}<`), `${name} label`);
    for (const s of data.sources) assert.ok(page.includes(s.url.replace(/&/g, "&amp;")) || page.includes(s.url), `${name} source ${s.url}`);
    const ld = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const graph = ld.flatMap((g) => g["@graph"] || [g]);
    const newsroom = graph.find((n) => n["@type"] === "NewsMediaOrganization");
    assert.equal(newsroom.name, "RingZine");
  }
});
