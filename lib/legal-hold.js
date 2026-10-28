// JI Ventures pre-publish legal hold (RULE.md, 27 Oct 2026).
// Any published post that trips a rule fails the build and CI with HOLD_REVIEW.
// A held post must be draft: true with review: HOLD_REVIEW. It may only be built
// again when content-review/approvals.jsonl holds Joshua's approval of its exact sha256.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export const HOLD = "HOLD_REVIEW";
const PROSE_FIELDS = ["title", "summary", "description"];

const RULES = [
  {
    rule: 1,
    severity: "high",
    label: "possible allegation of crime or serious wrongdoing",
    re: /\b(arrest(ed|s)?|charged with|indict(ed|ment)|lawsuits?|sued|suing|fraud|embezzl\w*|abus(e|ed|ive)|domestic violence|DUI|harass\w*|misconduct|allegations?|allegedly|accused|police|convicted|felony|sexual|scandal|steroids?|wellness policy|brib\w*|corrupt\w*|stole|theft|extort\w*)\b/i,
  },
  {
    rule: 2,
    severity: "high",
    label: "sensitive health or personal information about a real person",
    re: /\b(medical(ly)?|injur(y|ies|ed)|surgery|surgical|hospital\w*|concussion|diagnos\w*|illness|pregnan\w*|rehab\w*|mental health|overdose|cancer|home address|phone number)\b/i,
  },
  { rule: 2, severity: "high", label: "phone number or email address in copy", re: /(\+?\d[\d ().]{8,}\d)|([\w.+]+@[\w-]+\.[a-z]{2,})/i },
  {
    rule: 5,
    severity: "moderate",
    label: "betting or financial guidance",
    re: /\b(bet on|betting|sportsbook|parlay|invest in|buy (the )?stock|guaranteed (return|profit))\b/i,
  },
  {
    rule: 6,
    severity: "high",
    label: "election logistics",
    re: /\b(polling (place|station|location)s?|voter registration|register to vote|absentee ballot|mail ballot|election day|early voting)\b/i,
  },
  {
    rule: 8,
    severity: "high",
    label: "legal notice, takedown, embargo or correction request",
    re: /\b(cease and desist|DMCA|takedown|embargo(ed)?|legal notice|defamation)\b/i,
  },
];

const OFFICIAL_CLAIM = /\b(official partner|endorsed by|in partnership with|affiliated with) (WWE|AEW|TKO)\b/i;
const STRONG_HEADLINE = /\b(confirmed|official|exclusive|breaking)\b/i;
const EXTERNAL_MEDIA = /<(iframe|video|img|embed)\b|!\[[^\]]*\]\(\s*https?:/i;

export function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

// Each published hero must have an Original licence record.
export function loadImageRegister(root = ".") {
  const file = path.join(root, "content-review", "image-licenses.json");
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function loadApprovals(file) {
  if (!file || !fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function snippet(text, index) {
  return text.slice(Math.max(0, index - 60), index + 80).replace(/\s+/g, " ").trim();
}

export function checkPost(raw, { images = {} } = {}) {
  const { data, content } = matter(raw);
  const flags = [];
  const fields = PROSE_FIELDS.map((f) => String(data[f] ?? "")).join("\n");
  const alts = [data.hero?.alt, ...(Array.isArray(data.images) ? data.images.map((i) => i?.alt) : [])]
    .filter(Boolean)
    .join("\n");
  const tags = Array.isArray(data.tags) ? data.tags.join("\n") : "";
  const text = [fields, tags, alts, content].join("\n");

  for (const r of RULES) {
    const m = r.re.exec(text);
    if (m) flags.push({ rule: r.rule, severity: r.severity, reason: r.label, flagged: snippet(text, m.index) });
  }

  // Rule 3: every image needs a documented Original licence record. Fair use is never assumed.
  const heroes = [data.hero?.src, ...(Array.isArray(data.images) ? data.images.map((i) => i?.src) : [])].filter(Boolean);
  for (const src of heroes) {
    const rec = images[src];
    if (!rec || rec.license !== "Original") {
      flags.push({ rule: 3, severity: "moderate", reason: "image has no Original licence record", flagged: src });
    }
  }
  if (data.imageLicense && data.imageLicense !== "Original") {
    flags.push({ rule: 3, severity: "moderate", reason: `imageLicense ${data.imageLicense} is not documented permission`, flagged: String(data.image) });
  }
  const media = EXTERNAL_MEDIA.exec(content);
  if (media) flags.push({ rule: 3, severity: "moderate", reason: "external image, video or embed in body", flagged: snippet(content, media.index) });

  // Rule 4: rumors need a named outside outlet in sources and an inline link.
  if (data.status === "rumor") {
    const outside = (data.sources || []).filter((s) => !/^(WWE|AEW|All Elite Wrestling)$/i.test(String(s?.publisher || "")));
    if (!outside.length) flags.push({ rule: 4, severity: "moderate", reason: "rumor with no named outside source", flagged: String(data.title) });
  }
  if (!/\]\(\s*https?:\/\//.test(content)) {
    flags.push({ rule: 4, severity: "moderate", reason: "no inline source link in body", flagged: String(data.title) });
  }

  // Rule 7: headline stronger than the label, or implied affiliation.
  if (data.status === "rumor" && STRONG_HEADLINE.test(String(data.title))) {
    flags.push({ rule: 7, severity: "moderate", reason: "rumor headline uses confirmed, official, exclusive or breaking", flagged: String(data.title) });
  }
  const aff = OFFICIAL_CLAIM.exec(text);
  if (aff) flags.push({ rule: 7, severity: "moderate", reason: "implied official affiliation", flagged: snippet(text, aff.index) });

  // Rule 8: explicit front matter markers.
  for (const key of ["legalNotice", "correctionRequest", "embargo"]) {
    if (data[key]) flags.push({ rule: 8, severity: "high", reason: `${key} is set`, flagged: String(data[key]) });
  }
  return { data, flags };
}

// AMENDMENT 1 and 2 moderate path: a post whose flags are all moderate may publish
// when moderate-clearances.jsonl records an independent ChatGPT SAFE verdict for its exact sha256.
export function loadClearances(file) {
  return loadApprovals(file);
}

export function isModerateCleared(raw, flags, clearances) {
  if (!flags.length || flags.some((f) => f.severity !== "moderate")) return false;
  const hash = sha256(raw);
  return clearances.some((c) => c.site === "ringzine.com" && c.sha256 === hash && /^SAFE\b/.test(String(c.chatgpt_verdict || "")));
}

export function isApproved(file, raw, approvals) {
  const hash = sha256(raw);
  const base = path.basename(file);
  return approvals.some((a) => a.site === "ringzine.com" && a.sha256 === hash && path.basename(String(a.file || "")) === base && /joshua/i.test(String(a.approved_by || "")));
}

// Returns problems that must stop a publish. Drafts are never published, so they are skipped.
export function gatePostsDir(dir, { root = ".", approvalsFile = path.join(root, "content-review", "approvals.jsonl"), clearancesFile = "/workspace/content-review/moderate-clearances.jsonl" } = {}) {
  const images = loadImageRegister(root);
  const approvals = loadApprovals(approvalsFile);
  const clearances = loadClearances(clearancesFile);
  const blocked = [];
  const held = [];
  if (!fs.existsSync(dir)) return { ok: true, blocked, held };
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".md") && !n.startsWith("_")).sort()) {
    const file = path.join(dir, name);
    const raw = fs.readFileSync(file, "utf8");
    const { data, flags } = checkPost(raw, { images });
    const draft = data.draft === true || data.draft === "true";
    if (data.review === HOLD) {
      held.push(file);
      if (!draft && !isApproved(file, raw, approvals)) {
        blocked.push({ file, flags: [{ rule: 0, reason: "review is HOLD_REVIEW but the post is not a draft and has no approval of this exact version" }] });
      }
      continue;
    }
    if (draft) continue;
    if (flags.length && !isApproved(file, raw, approvals) && !isModerateCleared(raw, flags, clearances)) blocked.push({ file, flags });
  }
  return { ok: blocked.length === 0, blocked, held };
}

export function formatGate(result) {
  return result.blocked
    .map((b) => `${b.file}\n${b.flags.map((f) => `  - ${HOLD} rule ${f.rule}: ${f.reason}${f.flagged ? ` [${f.flagged}]` : ""}`).join("\n")}`)
    .join("\n");
}

// Turn a post into an unpublished HOLD_REVIEW draft and append one queue line.
export function holdPost(file, { bot = "Wrestling News Bot", queueFile, flags = [], suggestion = "" } = {}) {
  const raw = fs.readFileSync(file, "utf8");
  const parsed = matter(raw);
  parsed.data.draft = true;
  parsed.data.review = HOLD;
  fs.writeFileSync(file, matter.stringify(parsed.content, parsed.data));
  const entry = {
    ts: new Date().toISOString(),
    site: "ringzine.com",
    bot,
    title: String(parsed.data.title || path.basename(file)),
    flagged: flags.map((f) => f.flagged).filter(Boolean).join(" | "),
    rule: [...new Set(flags.map((f) => f.rule))],
    sources: (parsed.data.sources || []).map((s) => s.url).filter(Boolean),
    suggestion,
    draft_path: path.resolve(file),
    status: HOLD,
  };
  if (queueFile) fs.appendFileSync(queueFile, `${JSON.stringify(entry)}\n`);
  return entry;
}
