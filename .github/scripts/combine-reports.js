const fs = require('fs');
const path = require('path');
const { merge } = require('mochawesome-merge');
const reportDir = 'report/json';
const targetDir = 'report/json';
const targetFile = path.join(targetDir, 'result.json');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Merge all mochawesome reports
merge({
  files: [path.join(reportDir, '*.json')],
}).then(report => {
  fs.writeFileSync(targetFile, JSON.stringify(report, null, 2));
  console.log(`✅ Combined report saved to ${targetFile}`);
}).catch(error => {
  console.error(`❌ Error generating combined report: ${error.message}`);
  process.exit(1);
});