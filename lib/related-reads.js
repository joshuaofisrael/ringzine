import { coerceDate, isPendingPublication } from "./dates.js";

const GENERIC_TAGS = new Set(["post", "wwe", "aew", "news"]);

export function tagList(post) {
  const tags = post?.data?.tags;
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag) => typeof tag === "string" && tag.trim())
    .map((tag) => tag.trim())
    .filter((tag) => tag.toLowerCase() !== "post");
}

export function isExplainer(post) {
  if (String(post?.data?.label || "").toLowerCase() === "analysis") return true;
  const tags = tagList(post).map((tag) => tag.toLowerCase());
  if (tags.includes("explainer") || tags.includes("match rules")) return true;
  return /^how\b/i.test(String(post?.data?.title || ""));
}

function publishMs(post) {
  const raw = post?.data?.publishAt || post?.data?.date || post?.date;
  const when = coerceDate(raw);
  return when ? when.getTime() : 0;
}

function specificTags(post) {
  return tagList(post).filter((tag) => !GENERIC_TAGS.has(tag.toLowerCase()));
}

function sharedSpecific(current, post) {
  const theirs = new Set(specificTags(post).map((tag) => tag.toLowerCase()));
  return specificTags(current).filter((tag) => theirs.has(tag.toLowerCase())).length;
}

function livePosts(posts, includeDrafts) {
  return (posts || []).filter((post) => {
    if (!post?.url) return false;
    if (post.data?.draft === true || post.data?.sample === true) return false;
    if (!includeDrafts && isPendingPublication(post.data?.publishAt)) return false;
    return true;
  });
}

function rank(posts, current, { limit, mode }) {
  const currentUrl = current?.url;
  const currentMs = publishMs(current);
  const rows = [];
  for (const post of posts) {
    if (!post?.url || post.url === currentUrl) continue;
    const explainer = isExplainer(post);
    if (mode === "follow" && explainer) continue;
    if ((mode === "background" || mode === "compare") && !explainer) continue;
    if (mode === "follow" && publishMs(post) <= currentMs) continue;
    const shared = sharedSpecific(current, post);
    const sameDesk = post.data?.category && post.data.category === current?.data?.category ? 1 : 0;
    if (mode === "follow" && shared < 1) continue;
    if (mode === "related" && shared < 1 && !sameDesk) continue;
    rows.push({ post, shared, sameDesk, ms: publishMs(post) });
  }
  rows.sort((a, b) => {
    if (b.shared !== a.shared) return b.shared - a.shared;
    if (mode === "background" && b.sameDesk !== a.sameDesk) return b.sameDesk - a.sameDesk;
    if (b.ms !== a.ms) return b.ms - a.ms;
    return String(a.post.url).localeCompare(String(b.post.url));
  });
  if (mode === "related") {
    const strong = rows.filter((row) => row.shared > 0);
    const use = strong.length ? strong : rows.filter((row) => row.sameDesk);
    return use.slice(0, limit).map((row) => row.post);
  }
  if (mode === "follow") {
    const best = rows.reduce((max, row) => Math.max(max, row.shared), 0);
    const floor = best >= 2 ? 2 : 1;
    return rows.filter((row) => row.shared >= floor).slice(0, limit).map((row) => row.post);
  }
  return rows.slice(0, limit).map((row) => row.post);
}

export function readsForPage(posts, currentInput, { includeDrafts = false } = {}) {
  const current = {
    url: currentInput?.url || "",
    data: {
      category: currentInput?.category || "",
      tags: currentInput?.tags || [],
      date: currentInput?.date,
      publishAt: currentInput?.date,
      label: currentInput?.label,
      title: currentInput?.title,
    },
  };
  const published = livePosts(posts, includeDrafts);
  const related = rank(published, current, { limit: 8, mode: "related" });
  const followUps = rank(published, current, { limit: 3, mode: "follow" });
  const followUrls = new Set(followUps.map((post) => post.url));
  const mid = related.slice(0, 4);
  const unused = related.filter((post) => !followUrls.has(post.url));
  const end = unused.length >= 3 ? unused.slice(0, 4) : related.slice(0, 4);
  const explainer = isExplainer(current);
  return {
    explainer,
    mid,
    end,
    followUps,
    background: explainer ? [] : rank(published, current, { limit: 3, mode: "background" }),
    compare: explainer ? rank(published, current, { limit: 4, mode: "compare" }) : [],
  };
}

export function insertHtmlAfterParagraph(html, block) {
  const extra = String(block ?? "").trim();
  const source = String(html || "");
  if (!extra) return source;
  const total = (source.match(/<\/p>/gi) || []).length;
  if (total < 1) return `${source}\n${extra}`;
  const at = total <= 2 ? 1 : Math.min(total - 1, Math.max(2, Math.round(total * 0.4)));
  const chunks = source.split(/(<\/p>)/i);
  let paragraph = 0;
  let out = "";
  let inserted = false;
  for (const chunk of chunks) {
    out += chunk;
    if (!/^<\/p>$/i.test(chunk)) continue;
    paragraph += 1;
    if (!inserted && paragraph === at) {
      out += `\n${extra}\n`;
      inserted = true;
    }
  }
  return inserted ? out : `${source}\n${extra}`;
}
