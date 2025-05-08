const fs = require("fs");
const path = require("path");

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
const suites = report.results || report.suites || report.children || [];

// Calculate test counts
const totalTests = stats.tests || stats.testsRegistered || 0;
const passedTests = stats.passes || stats.passed || 0;
const failedTests = stats.failures || stats.failed || 0;
const pendingTests = stats.pending || 0;
const skippedTests = stats.skipped || 0;
const passPercent = totalTests ? ((passedTests / totalTests) * 100).toFixed(2) : "0.00";
const duration = (stats.duration || stats.duration || 0) / 1000;

// Status emoji
const overallEmoji = failedTests === 0 ? "✅" : "❌";
const passRateEmoji = passPercent >= 95 ? "✅" : passPercent >= 80 ? "⚠️" : "🚨";

// Extract test suite details
const suiteDetails = [];

// Recursively process suites and their tests
const processSuite = (suite, path = "") => {
  if (!suite) return;
  
  const currentPath = path ? `${path} > ${suite.title || suite.description}` : (suite.title || suite.description || "Root");
  

  const childSuites = suite.suites || suite.children || [];
  if (childSuites && childSuites.length > 0) {
    childSuites.forEach(childSuite => {
      processSuite(childSuite, currentPath);
    });
  }

  const tests = suite.tests || suite.specs || [];
  if (tests && tests.length > 0) {
    const total = tests.length;
    const passed = tests.filter(t => t.state === 'passed' || t.pass === true).length;
    const failed = tests.filter(t => t.state === 'failed' || t.fail === true).length;
    const pending = tests.filter(t => t.state === 'pending' || t.pending === true).length;
    const skipped = tests.filter(t => t.state === 'skipped' || t.skipped === true).length;
    const percentage = total ? ((passed / total) * 100).toFixed(2) : "0.00";
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

if (suites.forEach) {
  suites.forEach(suite => {
    processSuite(suite);
  });
} else if (suites) {
  processSuite(suites);
}

if (suiteDetails.length === 0 && totalTests > 0) {
  suiteDetails.push({
    suite: "All Tests",
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    pending: pendingTests,
    skipped: skippedTests,
    percentage: passPercent,
    emoji: overallEmoji
  });
}

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

// Collect failed tests
const failedTestList = [];

const findFailedTests = (suite) => {
  if (!suite) return;
  
  const tests = suite.tests || suite.specs || [];
  if (tests && tests.length > 0) {
    tests.forEach(test => {
      if (test.state === 'failed' || test.fail === true) {
        failedTestList.push({
          title: test.fullTitle || test.fullName || test.title,
          error: test.err?.message || test.failedExpectations?.map(fe => fe.message).join("\n") || "Unknown error",
          duration: (test.duration || test.duration || 0) / 1000 // Convert to seconds
        });
      }
    });
  }
  
  const childSuites = suite.suites || suite.children || [];
  if (childSuites && childSuites.length > 0) {
    childSuites.forEach(findFailedTests);
  }
};

if (suites.forEach) {
  suites.forEach(findFailedTests);
} else if (suites) {
  findFailedTests(suites);
}

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
try {
  // Make sure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, md, "utf-8");
  console.log(`✅ Markdown summary saved to ${outputPath}`);
} catch (error) {
  console.error(`❌ Failed to save markdown to ${outputPath}: ${error.message}`);
  process.exit(1);
}