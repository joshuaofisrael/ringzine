import site from "../../_data/site.js";
import { isPendingPublication } from "../../../lib/dates.js";
import { isDraft } from "../../../lib/validate-posts.js";

const includeDrafts = process.env.ELEVENTY_ENV === "development";

function heldBack(data) {
  return (isDraft(data.draft) || isPendingPublication(data.publishAt)) && !includeDrafts;
}

export default {
  layout: "layouts/article.njk",
  kind: "article",
  eleventyComputed: {
    author() {
      return site.author;
    },
    scheduled(data) {
      return isPendingPublication(data.publishAt);
    },
    permalink(data) {
      if (heldBack(data)) return false;
      const file = String(data.page.inputPath).split("/").pop().replace(/\.md$/, "");
      return `/articles/${file}/`;
    },
    eleventyExcludeFromCollections(data) {
      return heldBack(data);
    },
  },
};
