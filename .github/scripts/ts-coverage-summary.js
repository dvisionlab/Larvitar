const fs = require('fs');
const path = require('path');

const coverageFile = path.resolve(process.argv[2] || 'typescript-coverage.json');
const data = JSON.parse(fs.readFileSync(coverageFile, 'utf-8'));
const { totals, files } = data;

let summary = '## 🧪 TypeScript Coverage Summary\n\n';
summary += `**Total Coverage**: \`${totals.percent}%\` (${totals.covered}/${totals.total} lines)\n\n`;
summary += '| File | Coverage |\n';
summary += '|------|----------|\n';

for (const file of files) {
  summary += `| ${file.filename} | ${file.percent}% |\n`;
}

fs.writeFileSync('coverage-summary.md', summary);

// Optional: fail the job if below threshold
const minCoverage = 80;
if (totals.percent < minCoverage) {
  console.error(`::error::Coverage ${totals.percent}% is below threshold (${minCoverage}%)`);
  process.exit(1);
}