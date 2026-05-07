import { existsSync, readFileSync, statSync } from "node:fs";

const files = [
  "index.html",
  "projects/tempestas.html",
  "projects/pegasus.html",
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
}

const home = read("index.html");
expect(!/TBD|pshhh|href="#"/.test(home), "index.html: placeholder project card should be removed or made real");
expect(/class="project-tags"/.test(home), "index.html: project cards should expose concrete tags");
expect(/110\.86 MW MAE/.test(home), "index.html: Tempestas card should show model outcome metric");
expect(/O\(1\) best bid\/ask/.test(home), "index.html: Pegasus card should show architecture/performance highlight");
expect(/&copy; 2026 Gabriel Meleiro/.test(home), "index.html: footer year should be 2026");
expect(/pegasus-preview\.webp/.test(home), "index.html: homepage should use optimized Pegasus preview asset");
expect(!/Threshold|threshold\//.test(home), "index.html: Threshold should not appear on the portfolio homepage");

const pegasus = read("projects/pegasus.html");
expect(/<div class="tech-stack">/.test(pegasus), "projects/pegasus.html: missing tech stack section");
expect(/<h2>Problem<\/h2>/.test(pegasus), "projects/pegasus.html: missing case-study Problem section");
expect(/<h2>Approach<\/h2>/.test(pegasus), "projects/pegasus.html: missing case-study Approach section");
expect(/<h2>Results<\/h2>/.test(pegasus), "projects/pegasus.html: missing case-study Results section");
expect(/class="architecture-diagram"/.test(pegasus), "projects/pegasus.html: missing visual architecture diagram");

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
