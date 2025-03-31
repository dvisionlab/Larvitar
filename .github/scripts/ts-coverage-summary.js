const fs = require('fs');
const path = require('path');

const reportPath = path.resolve(process.argv[2] || 'typescript-coverage.json');
const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

// Compute total coverage
let totalCovered = 0;
let totalLines = 0;

let summary = '## 🧪 TypeScript Coverage Summary\n\n';

summary += '| File | Coverage |\n';
summary += '|------|----------|\n';

data.forEach(({ filename, covered, total, percent }) => {
  totalCovered += covered;
  totalLines += total;
  summary += `| ${filename} | ${percent}% |\n`;
});

const totalPercent = ((totalCovered / totalLines) * 100).toFixed(1);
summary = `## 🧪 TypeScript Coverage Summary\n\n**Total Coverage**: \`${totalPercent}%\` (${totalCovered}/${totalLines} lines)\n\n` + summary;

fs.writeFileSync('coverage-summary.md', summary);

// Optional: fail if coverage is below threshold
const minCoverage = 80;
if (totalPercent < minCoverage) {
  console.error(`::error::Coverage ${totalPercent}% is below threshold (${minCoverage}%)`);
  process.exit(1);
}
