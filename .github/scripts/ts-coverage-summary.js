const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Input/output
const htmlPath = process.argv[2] || "index.html";
const outputPath = process.argv[3] || "coverage-summary.md";

// Load HTML
const html = fs.readFileSync(htmlPath, "utf-8");
const dom = new JSDOM(html);
const document = dom.window.document;

const tables = [...document.querySelectorAll("table")];
if (tables.length < 2) {
  console.error("❌ Expected at least 2 tables in the coverage HTML.");
  process.exit(1);
}

const summaryTable = tables[0];
const fileTable = tables[1];

// --- Extract summary values ---
const headers = [...summaryTable.querySelectorAll("th")].map((el) =>
  el.textContent.trim().toLowerCase()
);
const values = [...summaryTable.querySelectorAll("td")].map((el) =>
  el.textContent.trim().replace(/,/g, "")
);

const summary = {};
headers.forEach((key, i) => {
  const value = values[i];
  if (!value.includes("%")) {
    summary[key] = parseInt(value, 10);
  }
});

const total = summary["total"] || 0;
const covered = summary["covered"] || 0;
const uncovered = summary["uncovered"] || 0;
const percent = total ? ((covered / total) * 100).toFixed(2) : "0.00";
const emoji = percent >= 90 ? "✅" : percent >= 75 ? "⚠️" : "🚨";

// --- Extract file-level coverage ---
const fileRows = fileTable.querySelectorAll("tbody tr");
const fileData = [];

fileRows.forEach((row) => {
  const cols = row.querySelectorAll("td");
  if (cols.length >= 5) {
    const file = cols[0].textContent.trim();
    const percentVal = parseFloat(cols[1].textContent.trim().replace("%", ""));
    const fileEmoji = percentVal >= 90 ? "✅" : percentVal >= 75 ? "⚠️" : "🚨";

    fileData.push({
      file,
      percent: percentVal,
      total: parseInt(cols[2].textContent.replace(/,/g, ""), 10),
      covered: parseInt(cols[3].textContent.replace(/,/g, ""), 10),
      uncovered: parseInt(cols[4].textContent.replace(/,/g, ""), 10),
      emoji: fileEmoji,
    });
  }
});

// --- Generate Markdown ---
let md = `## 🧪 TypeScript Coverage Report

**Total Coverage**: \`${percent}%\` ${emoji}  
**Total Lines**: \`${total}\`  
**Covered**: \`${covered}\`  
**Uncovered**: \`${uncovered}\`

### 📄 File Coverage Details
| File | Coverage | Total | Covered | Uncovered |
|------|----------|--------|---------|-----------|
`;

fileData.forEach((f) => {
  md += `| \`${f.file}\` | ${f.percent}% ${f.emoji} | ${f.total} | ${f.covered} | ${f.uncovered} |\n`;
});

// Save it
fs.writeFileSync(outputPath, md, "utf-8");
console.log(`✅ Markdown saved to ${outputPath}`);
