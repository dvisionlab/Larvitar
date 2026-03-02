const fs = require("fs");
const path = require("path");

const txtPath = process.argv[2] || "typecov.txt";
const jsonPath = process.argv[3] || "typecov.json";
const outputPath = process.argv[4] || "coverage-summary.md";

const TARGET = Number(process.env.TYPECOV_TARGET ?? 90);
const TOP_N = Number(process.env.TYPECOV_TOPN ?? 5);
const BAR_LEN = Number(process.env.TYPECOV_BARLEN ?? 20);

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(txtPath)) fail(`Missing ${txtPath}`);
if (!fs.existsSync(jsonPath)) fail(`Missing ${jsonPath}`);

const txt = fs.readFileSync(txtPath, "utf8");
let json;
try {
  json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
} catch {
  fail(`Invalid JSON in ${jsonPath}`);
}

// Parse global summary line: "(39505 / 47105) 83.86%"
const m = txt.match(/\((\d+)\s*\/\s*(\d+)\)\s*([0-9]+(?:\.[0-9]+)?)%/);
if (!m) fail("Could not find summary like: (covered / total) xx.xx%");

const covered = parseInt(m[1], 10);
const total = parseInt(m[2], 10);
const percent = parseFloat(m[3]);

const statusEmoji = percent >= TARGET ? "✅" : percent >= 75 ? "⚠️" : "🚨";

const filled = Math.round((Math.max(0, Math.min(100, percent)) / 100) * BAR_LEN);
const bar = "█".repeat(filled) + "░".repeat(Math.max(0, BAR_LEN - filled));

const root = process.cwd();
const rel = (p) => {
  const rp = String(p || "unknown");
  const out = rp.startsWith(root) ? path.relative(root, rp) : rp;
  return out.replaceAll("\\", "/");
};

// Aggregate per file from json.details
const details = Array.isArray(json.details) ? json.details : [];
const byFile = new Map();

for (const d of details) {
  const file = rel(d.filePath);
  byFile.set(file, (byFile.get(file) ?? 0) + 1);
}

const hotspots = [...byFile.entries()]
  .map(([file, count]) => ({ file, count }))
  .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))
  .slice(0, TOP_N);

let md = `<!-- type-coverage-report -->
## 🧪 Type Coverage

### **${percent.toFixed(2)}%** ${statusEmoji}
\`(${covered} / ${total})\`

${bar}  **${percent.toFixed(2)}%**  
Target: **${TARGET}%**

**Top hotspots (untyped occurrences)**
| File | Uncovered |
|------|----------:|
`;

for (const h of hotspots) {
  md += `| \`${h.file}\` | ${h.count} |\n`;
}

fs.writeFileSync(outputPath, md, "utf8");
console.log(`✅ Wrote ${outputPath}`);
