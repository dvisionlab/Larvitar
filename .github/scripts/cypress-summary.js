const fs = require("fs");

// Input/output
const reportPath = process.argv[2] || "report/json/result.json";
const outputPath = process.argv[3] || "cypress-summary.md";

// Load the Cypress report JSON
const loadReport = () => {
  try {
    const data = fs.readFileSync(reportPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Failed to load report from ${reportPath}: ${error.message}`);
    process.exit(1);
  }
};

const report = loadReport();

// Extract test statistics
const stats = report.stats || {};
const suites = report.children || []; // Corrected to access "children" for suites

const totalTests = stats.tests || 0;
const passedTests = stats.passes || 0;
const failedTests = stats.failures || 0;
const pendingTests = stats.pending || 0;
const skippedTests = stats.skipped || 0;
const passPercent = totalTests ? ((passedTests / totalTests) * 100).toFixed(2) : "0.00";
const duration = (stats.duration || 0) / 1000; // Convert ms to seconds

// Status emoji
const overallEmoji = failedTests === 0 ? "✅" : "❌";
const passRateEmoji = passPercent >= 95 ? "✅" : passPercent >= 80 ? "⚠️" : "🚨";

// Extract test suite details
const suiteDetails = [];

// Recursively process suites and their tests
const processSuite = (suite, path = "") => {
  const currentPath = path ? `${path} > ${suite.description}` : suite.description;
  
  if (suite.children && suite.children.length > 0) {
    suite.children.forEach(childSuite => {
      processSuite(childSuite, currentPath);
    });
  }

  if (suite.children && suite.children.length > 0) {
    const total = suite.children.length;
    const passed = suite.children.filter(t => t.passedExpectations && t.passedExpectations.length > 0).length; // Check for passed expectations
    const failed = suite.children.filter(t => t.failedExpectations && t.failedExpectations.length > 0).length; // Check for failed expectations
    const pending = 0; // Assuming pending state isn't available in the provided data
    const skipped = 0; // Same assumption as pending
    const percentage = ((passed / total) * 100).toFixed(2);
    const emoji = failed > 0 ? "❌" : "✅";
    
    suiteDetails.push({
      suite: currentPath,
      total,
      passed,
      failed,
      pending,
      skipped,
      percentage,
      emoji
    });
  }
};

// Process all suites
suites.forEach(suite => {
  processSuite(suite);
});

// Generate Markdown
let md = `## 🔍 Cypress Test Results

**Status**: ${overallEmoji} ${failedTests === 0 ? 'All tests passed' : `${failedTests} tests failed`}  
**Pass Rate**: \`${passPercent}%\` ${passRateEmoji}  
**Total Tests**: \`${totalTests}\`  
**Passed**: \`${passedTests}\`  
**Failed**: \`${failedTests}\`  
**Pending/Skipped**: \`${pendingTests + skippedTests}\`  
**Duration**: \`${duration.toFixed(2)}s\`

### 📊 Test Suite Details
| Suite | Status | Pass % | Total | Passed | Failed | Pending |
|-------|--------|--------|-------|--------|--------|---------|
`;

suiteDetails.forEach(suite => {
  md += `| \`${suite.suite}\` | ${suite.emoji} | ${suite.percentage}% | ${suite.total} | ${suite.passed} | ${suite.failed} | ${suite.pending + suite.skipped} |\n`;
});

// Add failed tests details if any
const failedTestList = [];
suites.forEach(mainSuite => {
  const findFailedTests = (suite) => {
    if (suite.children) {
      suite.children.forEach(test => {
        if (test.failedExpectations && test.failedExpectations.length > 0) {
          failedTestList.push({
            title: test.fullName,
            error: test.failedExpectations.map(fe => fe.message).join("\n") || "Unknown error",
            duration: test.duration / 1000 // Convert to seconds
          });
        }
      });
    }
    
    if (suite.children) {
      suite.children.forEach(findFailedTests);
    }
  };
  
  if (mainSuite.children && mainSuite.children.length > 0) {
    findFailedTests(mainSuite);
  }
});

if (failedTestList.length > 0) {
  md += `\n### ❌ Failed Tests\n`;
  
  failedTestList.forEach((test, index) => {
    md += `
<details>
<summary><b>${index + 1}. ${test.title}</b> (${test.duration.toFixed(2)}s)</summary>

**Error**:
\`\`\`
${test.error}
\`\`\`
</details>
`;
  });
}

// Save the markdown
fs.writeFileSync(outputPath, md, "utf-8");
console.log(`✅ Markdown saved to ${outputPath}`);
