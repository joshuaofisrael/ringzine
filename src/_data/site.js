import { normalizeSiteUrl } from "../../lib/site-url.js";

const site = {
  name: "RingZine",
  tagline: "WWE and AEW news, results first.",
  brandLine: "Results, news, and clearly labelled rumors from WWE and AEW.",
  description:
    "RingZine covers WWE and AEW with answer first results and news. Every story is labelled Confirmed or Rumor and links its sources.",
  url: normalizeSiteUrl("https://ringzine.com"),
  locale: "en_US",
  language: "en",
  author: "RingZine",
  sameAs: [],
  operator: "Joshua Israel Ventures LLC",
  jurisdiction: "Florida",
  entityDescription: "a Florida limited liability company",
  contactEmail: "",
  // FormSubmit hashed alias for joshuaofisrael@gmail.com. Keeps the inbox out of the built pages.
  contactFormEndpoint: "https://formsubmit.co/4497ee41a1200e746e967998473d21da",
  indexNowKey: "8eadc25e650bf6cf04df6f0295221f48",
  // Cloudflare Web Analytics token. Empty until the ringzine.com site is added in Cloudflare.
  cloudflareAnalyticsToken: "",
  // GA4 measurement id. consent.js loads gtag only after Accept.
  ga4MeasurementId: "G-6XNF3J2GZD",
  homePhoto: {
    src: "home-hero",
    alt: "Dark RingZine title card with red, white, and blue ring ropes stretched between two steel posts",
  },
  year: new Date().getUTCFullYear(),
  buildTime: new Date().toISOString(),
  crawlers: [
    "Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot",
    "ClaudeBot", "Claude-SearchBot", "CCBot", "Google-Extended", "Applebot", "Applebot-Extended",
    "Bytespider", "DuckDuckBot", "YandexBot",
  ],
  categories: [
    {
      name: "WWE",
      slug: "wwe",
      seoTitle: "WWE news and results",
      photo: "cat-wwe",
      photoAlt: "Dark RingZine WWE section card with ring ropes and the words Raw, SmackDown and premium live event results",
      description: "Raw, SmackDown, NXT, and premium live event results and news.",
      hubIntro:
        "WWE news and results: Raw, SmackDown, and premium live events. Every story is labelled Confirmed or Rumor and links its sources.",
    },
    {
      name: "AEW",
      slug: "aew",
      seoTitle: "AEW news and results",
      photo: "cat-aew",
      photoAlt: "Dark RingZine AEW section card with ring ropes and the words Dynamite, Collision and pay per view results",
      description: "Dynamite, Collision, and pay per view results and news.",
      hubIntro:
        "AEW news and results: Dynamite, Collision, and pay per views. Every story is labelled Confirmed or Rumor and links its sources.",
    },
  ],
};

export default site;
