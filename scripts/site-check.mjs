import { existsSync, readFileSync, statSync } from "node:fs";

const files = [
  "index.html",
  "projects/tempestas.html",
  "projects/pegasus.html",
  "projects/orpheus.html",
  "projects/openml-upload.html",
];

const failures = [];

function read(path) {
  return readFileSync(path, "utf8");
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

for (const file of files) {
  const html = read(file);
  expect(/<meta name="description" content="[^"]{40,}">/.test(html), `${file}: missing useful meta description`);
  expect(/<meta property="og:title" content="[^"]+">/.test(html), `${file}: missing og:title`);
  expect(/<meta property="og:description" content="[^"]+">/.test(html), `${file}: missing og:description`);
  expect(/<meta property="og:type" content="website">/.test(html), `${file}: missing og:type`);

  const blankTargets = html.match(/<a\b(?=[^>]*target="_blank")(?![^>]*rel="noopener noreferrer")[^>]*>/g) || [];
  expect(blankTargets.length === 0, `${file}: external target=_blank links need rel="noopener noreferrer"`);

  // A wrapped or hand-edited link must never end up with whitespace in its address.
  const brokenHrefs = (html.match(/href="[^"]*\s[^"]*"/g) || []);
  expect(brokenHrefs.length === 0, `${file}: link address contains whitespace: ${brokenHrefs[0]}`);

  // Copy should read like a person wrote it. These are the words the AI-patterns
  // guide flags most strongly; see the writing-style notes before adding any back.
  const copy = html.replace(/<(script|style|svg|head)\b[\s\S]*?<\/\1>/g, "").replace(/<[^>]+>/g, " ");
  const flagged = copy.match(/\b(delve|tapestry|landscape|pivotal|underscore|testament|intricate|meticulous|nuanced|multifaceted|embark|spearhead|bolster|garner|interplay|realm|crucial|vibrant|foster|enhance|leverage|navigate|resonate|showcase|robust|holistic|comprehensive|innovative|seamless(ly)?|cutting-edge|game-changer|furthermore|moreover|additionally|consequently|nevertheless|subsequently|notably|indeed|nonetheless|hence|thus)\b/gi) || [];
  expect(flagged.length === 0, `${file}: AI-sounding words in copy: ${[...new Set(flagged)].join(", ")}`);

  // All styling lives in style.css — inline <style> blocks drift out of sync.
  expect(!/<style[\s>]/.test(html), `${file}: page-level <style> block should move into style.css`);
  expect(/href="[^"]*style\.css/.test(html), `${file}: should link the shared stylesheet`);

  // theme.js must be render-blocking in <head> or the page flashes the wrong theme.
  expect(/<script src="[^"]*scripts\/theme\.js[^"]*"><\/script>/.test(html), `${file}: theme script should load blocking in <head>`);
  expect(/data-theme-toggle/.test(html), `${file}: should expose the theme toggle`);

  expect(/<link rel="icon" href="[^"]*favicon\.svg"/.test(html), `${file}: missing favicon`);
  // One background effect on the whole site: the water on the homepage. Case studies stay still.
  const water = /<script src="[^"]*scripts\/descent\.js[^"]*" defer><\/script>/.test(html);
  expect(file === "index.html" ? water : !water, file === "index.html" ? `${file}: should load scripts/descent.js` : `${file}: case studies should not load the water background`);
  expect(!/scripts\/ocean\.js/.test(html), `${file}: the ASCII shark background was removed`);

  // ASCII fields are decoration: they need their script and must stay hidden from screen readers.
  if (/data-field="/.test(html)) {
    expect(/<script src="[^"]*scripts\/field\.js[^"]*" defer><\/script>/.test(html), `${file}: uses data-field but doesn't load field.js`);
    const fields = html.match(/<canvas[^>]*data-field="[^"]*"[^>]*>/g) || [];
    expect(fields.every((tag) => /aria-hidden="true"/.test(tag)), `${file}: field canvases need aria-hidden="true"`);
  }
}

const home = read("index.html");
expect(!/TBD|pshhh|href="#"/.test(home), "index.html: placeholder project card should be removed or made real");
expect(/class="feature" id="orpheus"/.test(home), "index.html: Orpheus should be the featured project");
expect(/class="feature-media"/.test(home), "index.html: featured project needs a media frame");
expect(/href="projects\/orpheus\.html"/.test(home), "index.html: Orpheus card should link to its case study");
expect(/href="projects\/openml-upload\.html"/.test(home), "index.html: OpenML Upload card should link to its case study");
expect(/href="projects\/pegasus\.html"/.test(home), "index.html: Pegasus row should link to its case study");

// Case studies carry the detail the homepage cards intentionally omit.
for (const [file, repo] of [
  ["projects/tempestas.html", "github\\.com/gabrielmeleiro1/Tempestas"],
  ["projects/orpheus.html", "github\\.com/gabrielmeleiro1/Orpheus"],
  ["projects/openml-upload.html", "github\\.com/gabrielmeleiro1/openml-upload"],
  ["projects/pegasus.html", "github\\.com/gabrielmeleiro1/Pegasus"],
]) {
  const page = read(file);
  expect(new RegExp(repo).test(page), `${file}: should link to its repository`);
  expect(/class="diagram"/.test(page), `${file}: missing SVG system diagram`);
  expect(/aria-label="Diagram:/.test(page), `${file}: diagram needs an aria-label description`);
  expect(/class="stat-row"/.test(page), `${file}: missing stat row`);
  expect(/class="story"/.test(page), `${file}: missing the written story`);
  expect(/class="case-next"/.test(page), `${file}: missing next-project link`);

  // The story is plain paragraphs: no card grids or bullet lists, and no em dashes.
  expect(!/class="(tile|tiles|steps|decisions|chips)"/.test(page), `${file}: story should be paragraphs, not cards or lists`);
  expect(!/\u2014|&mdash;/.test(page), `${file}: avoid em dashes in site copy`);
}
expect(/&copy; 2026 Gabriel Meleiro/.test(home), "index.html: footer year should be 2026");
expect(!/Threshold|threshold\//.test(home), "index.html: Threshold should not appear on the portfolio homepage");

// The homepage stays light: headline numbers live on the case pages, not here.
expect(!/class="(feature-facts|ledger-stat|hero-role)/.test(home), "index.html: keep key figures and the hero blurb off the homepage");

// The Pegasus preview moved off the homepage into the case study.
const pegasus = read("projects/pegasus.html");
expect(/pegasus-preview\.webp/.test(pegasus), "projects/pegasus.html: should use the optimized Pegasus preview asset");

const preview = "projects/pegasus-preview.webp";
try {
  const size = statSync(preview).size;
  expect(size < 250_000, `${preview}: preview should stay under 250KB`);
} catch {
  failures.push(`${preview}: optimized preview asset is missing`);
}

expect(!existsSync("threshold"), "threshold/: Threshold project files should be removed from the website");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`site-check passed for ${files.length} HTML files`);
