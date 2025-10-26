#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running Release Check...\n');

const checks = [
  {
    name: 'Git Status',
    command: 'git status --porcelain',
    expectEmpty: true,
    critical: true
  },
  {
    name: 'Linting',
    command: 'npm run lint',
    expectEmpty: false,
    critical: true
  },
  {
    name: 'Type Checking',
    command: 'npm run type-check',
    expectEmpty: false,
    critical: true
  },
  {
    name: 'Unit Tests',
    command: 'npm run test:unit',
    expectEmpty: false,
    critical: true
  },
  {
    name: 'Build Test',
    command: 'npm run build',
    expectEmpty: false,
    critical: true
  },
  {
    name: 'Security Audit',
    command: 'npm audit --audit-level=moderate',
    expectEmpty: false,
    critical: false
  }
];

let passed = 0;
let failed = 0;
const results = [];

for (const check of checks) {
  console.log(`\n📋 ${check.name}...`);
  
  try {
    const output = execSync(check.command, { encoding: 'utf8' });
    
    if (check.expectEmpty && output.trim()) {
      console.log(`❌ ${check.name} failed - working directory not clean`);
      failed++;
      results.push({ check: check.name, status: 'FAILED', reason: 'Working directory not clean' });
      
      if (check.critical) {
        console.log(`\n💥 Critical check failed: ${check.name}`);
        process.exit(1);
      }
    } else {
      console.log(`✅ ${check.name} passed`);
      passed++;
      results.push({ check: check.name, status: 'PASSED' });
    }
  } catch (error) {
    console.log(`❌ ${check.name} failed`);
    failed++;
    results.push({ check: check.name, status: 'FAILED', reason: error.message });
    
    if (check.critical) {
      console.log(`\n💥 Critical check failed: ${check.name}`);
      process.exit(1);
    }
  }
}

// Check for TODO/FIXME comments
console.log('\n📋 Checking for TODO/FIXME comments...');
try {
  const todoOutput = execSync('grep -r "TODO\\|FIXME" src/ server/ --exclude-dir=node_modules || true', { encoding: 'utf8' });
  if (todoOutput.trim()) {
    console.log('⚠️  Found TODO/FIXME comments:');
    console.log(todoOutput);
    results.push({ check: 'TODO/FIXME', status: 'WARNING', reason: 'Found TODO/FIXME comments' });
  } else {
    console.log('✅ No TODO/FIXME comments found');
    results.push({ check: 'TODO/FIXME', status: 'PASSED' });
  }
} catch (error) {
  console.log('✅ No TODO/FIXME comments found');
  results.push({ check: 'TODO/FIXME', status: 'PASSED' });
}

// Check for console.log statements
console.log('\n📋 Checking for console.log statements...');
try {
  const consoleOutput = execSync('grep -r "console\\.log" src/ server/ --exclude-dir=node_modules || true', { encoding: 'utf8' });
  if (consoleOutput.trim()) {
    console.log('⚠️  Found console.log statements:');
    console.log(consoleOutput);
    results.push({ check: 'console.log', status: 'WARNING', reason: 'Found console.log statements' });
  } else {
    console.log('✅ No console.log statements found');
    results.push({ check: 'console.log', status: 'PASSED' });
  }
} catch (error) {
  console.log('✅ No console.log statements found');
  results.push({ check: 'console.log', status: 'PASSED' });
}

// Check package.json for required fields
console.log('\n📋 Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredFields = ['name', 'version', 'description', 'main', 'scripts'];
  const missingFields = requiredFields.filter(field => !packageJson[field]);
  
  if (missingFields.length > 0) {
    console.log(`❌ Missing required fields: ${missingFields.join(', ')}`);
    results.push({ check: 'package.json', status: 'FAILED', reason: `Missing fields: ${missingFields.join(', ')}` });
    failed++;
  } else {
    console.log('✅ package.json has all required fields');
    results.push({ check: 'package.json', status: 'PASSED' });
    passed++;
  }
} catch (error) {
  console.log(`❌ Failed to read package.json: ${error.message}`);
  results.push({ check: 'package.json', status: 'FAILED', reason: error.message });
  failed++;
}

// Generate report
const report = {
  timestamp: new Date().toISOString(),
  total: results.length,
  passed,
  failed,
  results
};

fs.writeFileSync('release-check-report.json', JSON.stringify(report, null, 2));

console.log('\n📊 Release Check Summary:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📄 Report saved to release-check-report.json`);

if (failed > 0) {
  console.log('\n💥 Release check failed. Please fix the issues before releasing.');
  process.exit(1);
} else {
  console.log('\n🎉 Release check passed! Ready for release.');
}










