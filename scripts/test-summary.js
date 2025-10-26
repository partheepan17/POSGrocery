/**
 * Test results summary generator
 * Creates a comprehensive test summary with coverage badges
 */

const fs = require('fs');
const path = require('path');

function generateCoverageBadge(coverage, metric) {
  const percentage = coverage[metric]?.pct || 0;
  let color = 'red';
  
  if (percentage >= 90) color = 'brightgreen';
  else if (percentage >= 80) color = 'green';
  else if (percentage >= 70) color = 'yellowgreen';
  else if (percentage >= 60) color = 'yellow';
  else if (percentage >= 50) color = 'orange';
  
  return `![${metric} coverage](https://img.shields.io/badge/${metric}-${percentage}%25-${color})`;
}

function generateTestBadge(passed, total, type) {
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
  let color = 'red';
  
  if (percentage >= 90) color = 'brightgreen';
  else if (percentage >= 80) color = 'green';
  else if (percentage >= 70) color = 'yellowgreen';
  else if (percentage >= 60) color = 'yellow';
  else if (percentage >= 50) color = 'orange';
  
  return `![${type} tests](https://img.shields.io/badge/${type}-${passed}/${total}-${color})`;
}

function generateTestSummary() {
  console.log('📊 Generating Test Summary...');
  
  // Read coverage data
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  let coverage = null;
  
  if (fs.existsSync(coveragePath)) {
    try {
      coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    } catch (error) {
      console.warn('⚠️ Could not read coverage data:', error.message);
    }
  }
  
  // Read test results
  const testResultsPath = path.join(process.cwd(), 'test-results', 'results.json');
  let testResults = null;
  
  if (fs.existsSync(testResultsPath)) {
    try {
      testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
    } catch (error) {
      console.warn('⚠️ Could not read test results:', error.message);
    }
  }
  
  // Generate badges
  const badges = [];
  
  if (coverage) {
    badges.push(generateCoverageBadge(coverage.total, 'lines'));
    badges.push(generateCoverageBadge(coverage.total, 'statements'));
    badges.push(generateCoverageBadge(coverage.total, 'functions'));
    badges.push(generateCoverageBadge(coverage.total, 'branches'));
  }
  
  if (testResults) {
    const unitTests = testResults.suites?.find(s => s.title.includes('Unit')) || { tests: [] };
    const apiTests = testResults.suites?.find(s => s.title.includes('API')) || { tests: [] };
    const e2eTests = testResults.suites?.find(s => s.title.includes('E2E')) || { tests: [] };
    
    const unitPassed = unitTests.tests?.filter(t => t.status === 'passed').length || 0;
    const unitTotal = unitTests.tests?.length || 0;
    const apiPassed = apiTests.tests?.filter(t => t.status === 'passed').length || 0;
    const apiTotal = apiTests.tests?.length || 0;
    const e2ePassed = e2eTests.tests?.filter(t => t.status === 'passed').length || 0;
    const e2eTotal = e2eTests.tests?.length || 0;
    
    badges.push(generateTestBadge(unitPassed, unitTotal, 'Unit'));
    badges.push(generateTestBadge(apiPassed, apiTotal, 'API'));
    badges.push(generateTestBadge(e2ePassed, e2eTotal, 'E2E'));
  }
  
  // Generate summary markdown
  const summary = `# Test Results Summary

## Coverage Badges
${badges.join(' ')}

## Test Statistics

### Unit Tests
- **Framework**: Vitest
- **Coverage**: ${coverage ? `${coverage.total.lines.pct}%` : 'N/A'}
- **Focus**: Access control, dependency management, business logic

### API Integration Tests
- **Framework**: Vitest + Axios
- **Coverage**: All endpoints and error scenarios
- **Focus**: Authentication, authorization, feature toggles

### E2E Tests
- **Framework**: Playwright
- **Coverage**: Critical user journeys
- **Focus**: Real-time updates, role-based access, feature management

## Coverage Details
${coverage ? `
| Metric | Coverage | Threshold | Status |
|--------|----------|-----------|--------|
| Lines | ${coverage.total.lines.pct}% | 80% | ${coverage.total.lines.pct >= 80 ? '✅' : '❌'} |
| Statements | ${coverage.total.statements.pct}% | 80% | ${coverage.total.statements.pct >= 80 ? '✅' : '❌'} |
| Functions | ${coverage.total.functions.pct}% | 80% | ${coverage.total.functions.pct >= 80 ? '✅' : '❌'} |
| Branches | ${coverage.total.branches.pct}% | 80% | ${coverage.total.branches.pct >= 80 ? '✅' : '❌'} |
` : 'No coverage data available'}

## Test Results
${testResults ? `
| Test Suite | Passed | Total | Success Rate |
|------------|--------|-------|--------------|
| Unit Tests | ${unitPassed} | ${unitTotal} | ${unitTotal > 0 ? Math.round((unitPassed / unitTotal) * 100) : 0}% |
| API Tests | ${apiPassed} | ${apiTotal} | ${apiTotal > 0 ? Math.round((apiPassed / apiTotal) * 100) : 0}% |
| E2E Tests | ${e2ePassed} | ${e2eTotal} | ${e2eTotal > 0 ? Math.round((e2ePassed / e2eTotal) * 100) : 0}% |
` : 'No test results available'}

## Running Tests

\`\`\`bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:unit      # Unit tests
npm run test:api       # API integration tests
npm run test:e2e       # End-to-end tests

# Generate coverage report
npm run test:coverage
\`\`\`

## Test Configuration

- **Unit Tests**: Vitest with 80% coverage threshold
- **API Tests**: Vitest with Axios for HTTP testing
- **E2E Tests**: Playwright with multiple browsers
- **Coverage**: V8 provider with HTML, JSON, and LCOV reports
- **CI/CD**: GitHub Actions with matrix testing

---

*Generated on ${new Date().toISOString()}*
`;

  // Write summary to file
  const summaryPath = path.join(process.cwd(), 'TEST_SUMMARY.md');
  fs.writeFileSync(summaryPath, summary);
  
  console.log('✅ Test summary generated:', summaryPath);
  console.log('\n📊 Summary:');
  console.log(summary);
  
  return summary;
}

// Run if this script is executed directly
if (require.main === module) {
  generateTestSummary();
}

module.exports = { generateTestSummary };










