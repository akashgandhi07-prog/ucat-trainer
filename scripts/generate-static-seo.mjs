import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ORIGIN = "https://ucat.theukcatpeople.co.uk";
const commonLinks = [
  ["Verbal Reasoning practice", "/ucat-verbal-reasoning-practice"],
  ["Decision Making practice", "/ucat-decision-making-practice"],
  ["Quantitative Reasoning practice", "/ucat-quantitative-reasoning-practice"],
  ["Situational Judgement practice", "/ucat-sjt-practice"],
  ["UCAT study guides", "/study-guides"],
];
const routes = [
  ["/", "Free UCAT Practice Trainer (UK)", "Free UCAT skills practice for UK medicine and dentistry applicants, with focused drills, explanations and measured progress.", "Free UCAT skills practice", "Build specific UCAT skills with free Verbal Reasoning, Decision Making, Quantitative Reasoning and Situational Judgement trainers.", "CollectionPage", commonLinks],
  ["/ucat-verbal-reasoning-practice", "UCAT Verbal Reasoning Practice", "Free UCAT Verbal Reasoning practice for reading speed, rapid recall, keyword scanning, inference and NOT/EXCEPT questions.", "UCAT Verbal Reasoning practice", "Train one Verbal Reasoning skill at a time, then use measured accuracy and speed to choose what to practise next.", "CollectionPage", [["Speed reading trainer", "/ucat-verbal-reasoning-speed-reading-trainer"], ["Rapid recall trainer", "/ucat-rapid-recall-trainer"], ["Keyword scanning trainer", "/ucat-keyword-scanning-trainer"], ["Inference trainer", "/ucat-inference-trainer"], ["NOT/EXCEPT trainer", "/ucat-vr-not-except-trainer"]]],
  ["/ucat-decision-making-practice", "UCAT Decision Making Practice", "Free UCAT Decision Making skills practice covering constraints, syllogisms, Venn logic, data reasoning and arguments.", "UCAT Decision Making practice", "Practise the recurring reasoning patterns used in UCAT Decision Making with targeted drills and explanations.", "CollectionPage", [["Constraint builder", "/ucat-dm-constraint-builder"], ["Syllogism foundations", "/ucat-syllogism-foundations-trainer"], ["Syllogism micro drills", "/ucat-syllogism-practice-micro-drills"], ["Syllogism macro drills", "/ucat-syllogism-practice-macro-drills"], ["Venn logic", "/ucat-venn-logic-practice-questions"], ["Data logic", "/ucat-data-logic-practice-questions"], ["Argument judgement", "/ucat-argument-judge-practice-questions"]]],
  ["/ucat-quantitative-reasoning-practice", "UCAT Quantitative Reasoning Practice", "Free UCAT Quantitative Reasoning skills practice for setup, data extraction, estimation, calculator fluency and conversions.", "UCAT Quantitative Reasoning practice", "Build accurate problem-solving and calculation habits before adding time pressure.", "CollectionPage", [["QR setup trainer", "/ucat-qr-setup-trainer"], ["Data extraction trainer", "/ucat-qr-data-extraction-trainer"], ["Estimation trainer", "/ucat-qr-estimation-trainer"], ["Calculator trainer", "/ucat-calculator-trainer"], ["Mental maths trainer", "/ucat-mental-maths-trainer"], ["Unit conversions trainer", "/ucat-unit-conversions-trainer"]]],
  ["/ucat-sjt-practice", "UCAT Situational Judgement Practice", "Free UCAT SJT practice for appropriateness, importance and ranking questions grounded in GMC Good Medical Practice.", "UCAT Situational Judgement practice", "Practise professional judgement by topic, review mistakes after a delay and read the reasoning behind every response.", "CollectionPage", [["Appropriateness questions", "/ucat-sjt-appropriateness-trainer"], ["Importance questions", "/ucat-sjt-importance-trainer"], ["Ranking questions", "/ucat-sjt-ranking-trainer"]]],
  ["/study-guides", "Free UCAT Study Guides", "Free UCAT strategy guides and worked guidance for UK medicine and dentistry applicants.", "Free UCAT study guides", "Use concise guidance alongside focused practice to understand how each UCAT question type works.", "CollectionPage", commonLinks],
];
const trainers = [
  ["/ucat-verbal-reasoning-speed-reading-trainer", "UCAT Speed Reading Trainer", "Build reading speed while protecting comprehension with measured UCAT practice."],
  ["/ucat-rapid-recall-trainer", "UCAT Rapid Recall Trainer", "Practise retaining key details from UCAT-style passages."],
  ["/ucat-keyword-scanning-trainer", "UCAT Keyword Scanning Trainer", "Practise locating names, dates and key terms quickly in UCAT-style passages."],
  ["/ucat-inference-trainer", "UCAT Inference Trainer", "Practise separating supported conclusions from assumptions in UCAT Verbal Reasoning."],
  ["/ucat-vr-not-except-trainer", "UCAT NOT and EXCEPT Trainer", "Practise accuracy on negatively worded UCAT Verbal Reasoning questions."],
  ["/ucat-calculator-trainer", "UCAT Calculator Trainer", "Build speed and accuracy with the UCAT-style on-screen calculator."],
  ["/ucat-mental-maths-trainer", "UCAT Mental Maths Trainer", "Build fast arithmetic and estimation for UCAT Quantitative Reasoning."],
  ["/ucat-unit-conversions-trainer", "UCAT Unit Conversions Trainer", "Practise metric units, time, rates and per-100 conversions for UCAT QR."],
  ["/ucat-qr-setup-trainer", "UCAT QR Setup Trainer", "Practise translating numerical situations into the correct calculation and unit."],
  ["/ucat-qr-data-extraction-trainer", "UCAT QR Data Extraction Trainer", "Practise locating and combining the right values in tables."],
  ["/ucat-qr-estimation-trainer", "UCAT QR Estimation Trainer", "Practise controlled estimation and answer elimination."],
  ["/ucat-dm-constraint-builder", "UCAT DM Constraint Builder", "Construct arrangements that satisfy logical rules and inspect every constraint."],
  ["/ucat-syllogism-foundations-trainer", "UCAT Syllogism Foundations", "Learn the core premise and conclusion patterns used in UCAT syllogisms."],
  ["/ucat-syllogism-practice-micro-drills", "UCAT Syllogism Micro Drills", "Build rapid recognition using one-premise UCAT syllogism drills."],
  ["/ucat-syllogism-practice-macro-drills", "UCAT Syllogism Macro Drills", "Practise full UCAT-style syllogism sets with multiple conclusions."],
  ["/ucat-venn-logic-practice-questions", "UCAT Venn Logic Questions", "Practise set relationships and Venn logic for UCAT Decision Making."],
  ["/ucat-data-logic-practice-questions", "UCAT Data Logic Questions", "Practise probability and data reasoning for UCAT Decision Making."],
  ["/ucat-argument-judge-practice-questions", "UCAT Strongest Argument Questions", "Practise identifying relevant and persuasive arguments for UCAT Decision Making."],
  ["/ucat-sjt-appropriateness-trainer", "UCAT SJT Appropriateness Questions", "Rate responses using professional standards and GMC Good Medical Practice."],
  ["/ucat-sjt-importance-trainer", "UCAT SJT Importance Questions", "Judge the importance of considerations in UCAT Situational Judgement scenarios."],
  ["/ucat-sjt-ranking-trainer", "UCAT SJT Ranking Questions", "Choose the most and least appropriate responses in UCAT SJT scenarios."],
].map(([url, title, intro]) => [url, title, `${intro} Free practice with immediate explanations.`, title, intro, "LearningResource", commonLinks]);
routes.push(...trainers);
routes.push(
  ["/study-plan", "Free UCAT Study Plan Builder (UK)", "Answer seven quick questions and get a free, personalised UCAT revision schedule built around your test date, weekly hours and weakest sections.", "Free UCAT study plan builder", "Answer seven quick questions and get a personalised UCAT revision schedule built around your test date, weekly hours and weakest sections.", "LearningResource", commonLinks],
  ["/mock-scores", "Free UCAT Mock Score Tracker (UK)", "Log your UCAT full and mini mock scores, set section targets and see your trend over time. Free, with your scores saved across devices.", "Free UCAT mock score tracker", "Log full and mini mock scores, set section targets and see how your scaled scores are trending before test day.", "LearningResource", commonLinks],
);

const escapeHtml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const template = await readFile(path.resolve("dist/index.html"), "utf8");
// The catch-all rewrite in vercel.json serves this untouched shell for every route without
// its own file (study planner, mock scores, dashboard...), so none of them inherit the home
// page's canonical, schema or snapshot.
await writeFile(path.resolve("dist/app-shell.html"), template);

for (const [url, title, description, heading, intro, pageType, links] of routes) {
  const canonical = `${ORIGIN}${url === "/" ? "/" : url}`;
  const pageSchema = {
    "@type": pageType, "@id": `${canonical}#page`,
    url: canonical, name: title, description, inLanguage: "en-GB",
    isPartOf: { "@id": `${ORIGIN}/#website` }, publisher: { "@id": `${ORIGIN}/#organization` },
    ...(pageType === "LearningResource" ? { learningResourceType: "Interactive UCAT skills practice", isAccessibleForFree: true, educationalUse: "UCAT preparation" } : {}),
  };
  const schema = { "@context": "https://schema.org", "@graph": [
    { "@type": "Organization", "@id": `${ORIGIN}/#organization`, name: "TheUKCATPeople", url: "https://www.theukcatpeople.co.uk", areaServed: "GB" },
    { "@type": "WebSite", "@id": `${ORIGIN}/#website`, name: "Free UCAT Skills Trainer", url: ORIGIN, publisher: { "@id": `${ORIGIN}/#organization` }, inLanguage: "en-GB" },
    pageSchema,
  ] };
  const linkHtml = links.map(([label, href]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join("");
  const snapshot = `<main data-static-seo><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(intro)}</p><nav aria-label="Related UCAT practice"><h2>Related practice</h2><ul>${linkHtml}</ul></nav></main>`;
  const urlSpecificTags = `<link data-seo-static rel="canonical" href="${canonical}" /><meta data-seo-static property="og:url" content="${canonical}" /><script data-seo-static type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>`;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)} | TheUKCATPeople</title>`)
    .replace(/<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${escapeHtml(description)}" />`)
    .replace("</head>", `${urlSpecificTags}<meta data-seo-static property="og:title" content="${escapeHtml(title)}" /><meta data-seo-static property="og:description" content="${escapeHtml(description)}" /><style data-seo-static>[data-static-seo]{max-width:72rem;margin:2rem auto;padding:1rem;font-family:system-ui,sans-serif}[data-static-seo] a{color:#075985}</style></head>`)
    .replace('<div id="root"></div>', `<div id="root">${snapshot}</div>`);
  const output = url === "/" ? path.resolve("dist/index.html") : path.resolve(`dist${url}.html`);
  await writeFile(output, html);
}
console.log(`Generated route-specific static SEO HTML for ${routes.length} public pages.`);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(([url]) => `  <url><loc>${ORIGIN}${url === "/" ? "/" : url}</loc></url>`).join("\n")}\n</urlset>\n`;
await writeFile(path.resolve("dist/sitemap.xml"), sitemap);
