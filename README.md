# RingZine

WWE and AEW news, results and rumors at https://ringzine.com. Static Eleventy site deployed to GitHub Pages by `.github/workflows/pages.yml`.

## Develop

```sh
npm ci
npm test        # unit tests plus a full production build check
npm run build   # writes _site/
npm run dev     # local preview with drafts on port 8080
python3 scripts/audit-copy.py _site   # dashes, hyphens, owner name, banned terms
```

## Add an article

Create `src/content/posts/YYYY-MM-DD-slug.md`. Required front matter:

```yaml
title: Headline
date: 2026-10-27
updatedAt: 2026-10-27
category: WWE            # WWE or AEW
status: confirmed        # confirmed or rumor
summary: One sentence dek.
tags: [wwe-raw]
hero:
  src: basename          # src/assets/images/basename.webp and .avif
  alt: Full sentence describing the original title card
  width: 1280
  height: 720
sources:
  - title: Source page title
    url: https://...
    publisher: WWE
    date: 2026-10-26
publishAt: "2026-10-29T11:00:00Z"  # optional UTC time. Hidden until then.
```

`publishAt` keeps a finished story off the production site, the sitemap, and the feeds until that UTC time. `.github/workflows/scheduled-publish.yml` rebuilds and deploys at 11:00, 15:00, and 19:00 UTC, which is London time on 29 October 2026. A push to `main` also deploys, and any story whose time has already passed goes out with that build.

Rules:

* Every story is labelled Confirmed or Rumor. A rumor names and links the public outlet that reported it.
* Link the phrase you cite inline, and list every source in `sources`.
* No WWE or AEW footage, photos or logos. Use original title cards: `python3 scripts/make-graphics.py src/assets/images/NAME "KICKER" "Title" d97706`.
* No dashes or hyphenated compounds in visible copy. Never use the word Signal in a name.
* The owner name appears only on legal pages, through `partials/legal-notice.njk`.
* No ads, no AdSense, no Ezoic, no ads.txt.

## Analytics and consent

GA4 (`site.ga4MeasurementId`) loads only after the visitor accepts in the `#mtm-consent` banner (`src/assets/js/consent.js`). Consent Mode defaults to denied. The choice is stored under `mtm-analytics-consent`; the footer Cookie choices button reopens the banner.

## Contact

The contact form posts to FormSubmit and returns visitors to `/contact/thanks/`.

## Discovery

`sitemap.xml`, `news-sitemap.xml`, `feed.xml`, `atom.xml`, `robots.txt`, `llms.txt` and the IndexNow key file are generated on build. After a deploy run `npm run indexnow` (use `-- --dry-run` to preview).

## Deploy

Pushing to `main` runs the Pages workflow. The custom domain is set by the root `CNAME` file (ringzine.com).

## Legal hold (HOLD_REVIEW)

`scripts/deploy.sh` (`npm run deploy`) is the only publish path. It, the Eleventy build and CI all run `lib/legal-hold.js`: any published post that trips a JI Ventures hold rule fails the build. Hold a post with `node scripts/legal-hold.js hold <file> "why"`, which makes it a `draft: true`, `review: HOLD_REVIEW` file and appends one line to `/workspace/content-review/queue.jsonl`. It can be published again only when `content-review/approvals.jsonl` holds Joshua's approval of its exact sha256. Image licence records live in `content-review/image-licenses.json`.
