#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running Full QA Suite...\n');

const steps = [
  {
    name: 'Linting',
    command: 'npm run lint',
    critical: true
  },
  {
    name: 'Type Checking',
    command: 'npm run type-check',
    critical: true
  },
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    critical: true
  },
  {
    name: 'API Tests',
    command: 'npm run test:api',
    critical: true
  },
  {
    name: 'E2E Tests',
    command: 'npm run test:e2e',
    critical: false
  },
  {
    name: 'Build Test',
    command: 'npm run build',
    critical: true
  }
];

let passed = 0;
let failed = 0;
const results = [];

for (const step of steps) {
  console.log(`\n📋 ${step.name}...`);
  
  try {
    execSync(step.command, { stdio: 'inherit' });
    console.log(`✅ ${step.name} passed`);
    passed++;
    results.push({ step: step.name, status: 'PASSED' });
  } catch (error) {
    console.log(`❌ ${step.name} failed`);
    failed++;
    results.push({ step: step.name, status: 'FAILED', error: error.message });
    
    if (step.critical) {
      console.log(`\n💥 Critical step failed: ${step.name}`);
      process.exit(1);
    }
  }
}

console.log('\n📊 QA Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  total: steps.length,
  passed,
  failed,
  results
};

fs.writeFileSync('qa-report.json', JSON.stringify(report, null, 2));
console.log('\n📄 Report saved to qa-report.json');

if (failed > 0) {
  console.log('\n⚠️  Some non-critical tests failed. Check the report for details.');
  process.exit(1);
} else {
  console.log('\n🎉 All tests passed!');
}










