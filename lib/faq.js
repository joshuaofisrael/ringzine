const faq = [
  {
    question: "What does RingZine cover?",
    parts: [{ text: "RingZine covers WWE and AEW: weekly show results, premium live events and pay per views, title changes, injuries, and roster news." }],
  },
  {
    question: "What do the Confirmed and Rumor labels mean?",
    parts: [
      { text: "Confirmed means an official WWE or AEW source, such as the company's own results page or an on air announcement, backs the story. Rumor means a named outlet reported it and the company has not confirmed it. The full rule is in the " },
      { text: "editorial policy", href: "/editorial-policy/" },
      { text: "." },
    ],
  },
  {
    question: "Does RingZine use WWE or AEW photos?",
    parts: [
      { text: "No. Pictures on RingZine are original graphic title cards made for the site. We do not use promotion footage or photographs. Details are on the " },
      { text: "disclaimer", href: "/disclaimer/" },
      { text: " page." },
    ],
  },
  {
    question: "How does RingZine correct an error?",
    parts: [
      { text: "A factual error is fixed on the article with a note saying what changed, and the Last updated date moves. The policy is on the " },
      { text: "Corrections", href: "/corrections/" },
      { text: " page." },
    ],
  },
  {
    question: "How do I contact RingZine?",
    parts: [
      { text: "Use the " },
      { text: "contact form", href: "/contact/" },
      { text: ". We do not publish a street address." },
    ],
  },
];

export function faqAnswerText(item) {
  return item.parts.map((part) => part.text).join("");
}

export default faq;
