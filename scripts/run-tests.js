/**
 * Comprehensive test runner script
 * Runs all test suites and generates coverage reports
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      ...options 
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function runCommandAsync(command, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, { 
      shell: true, 
      stdio: 'inherit',
      ...options 
    });
    
    child.on('close', (code) => {
      resolve({ success: code === 0, code });
    });
    
    child.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });
  });
}

async function runUnitTests() {
  log('\n🧪 Running Unit Tests...', 'blue');
  
  const result = runCommand('npm run test:unit');
  if (!result.success) {
    log('❌ Unit tests failed', 'red');
    return false;
  }
  
  log('✅ Unit tests passed', 'green');
  return true;
}

async function runApiTests() {
  log('\n🔌 Running API Integration Tests...', 'blue');
  
  const result = runCommand('npm run test:api');
  if (!result.success) {
    log('❌ API tests failed', 'red');
    return false;
  }
  
  log('✅ API tests passed', 'green');
  return true;
}

async function runE2ETests() {
  log('\n🎭 Running E2E Tests...', 'blue');
  
  // Install Playwright browsers if not already installed
  log('📦 Installing Playwright browsers...', 'yellow');
  const installResult = runCommand('npx playwright install --with-deps');
  if (!installResult.success) {
    log('❌ Failed to install Playwright browsers', 'red');
    return false;
  }
  
  // Run E2E tests
  const result = await runCommandAsync('npm run test:e2e');
  if (!result.success) {
    log('❌ E2E tests failed', 'red');
    return false;
  }
  
  log('✅ E2E tests passed', 'green');
  return true;
}

async function runLinting() {
  log('\n🔍 Running Linting...', 'blue');
  
  const result = runCommand('npm run lint');
  if (!result.success) {
    log('❌ Linting failed', 'red');
    return false;
  }
  
  log('✅ Linting passed', 'green');
  return true;
}

async function runTypeChecking() {
  log('\n📝 Running Type Checking...', 'blue');
  
  const result = runCommand('npm run type-check');
  if (!result.success) {
    log('❌ Type checking failed', 'red');
    return false;
  }
  
  log('✅ Type checking passed', 'green');
  return true;
}

async function generateCoverageReport() {
  log('\n📊 Generating Coverage Report...', 'blue');
  
  const result = runCommand('npm run test:coverage');
  if (!result.success) {
    log('❌ Coverage generation failed', 'red');
    return false;
  }
  
  // Check if coverage meets thresholds
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const total = coverage.total;
    
    const thresholds = {
      lines: 80,
      statements: 80,
      functions: 80,
      branches: 80
    };
    
    let meetsThresholds = true;
    for (const [metric, threshold] of Object.entries(thresholds)) {
      const percentage = total[metric].pct;
      if (percentage < threshold) {
        log(`❌ Coverage ${metric}: ${percentage}% (threshold: ${threshold}%)`, 'red');
        meetsThresholds = false;
      } else {
        log(`✅ Coverage ${metric}: ${percentage}%`, 'green');
      }
    }
    
    if (!meetsThresholds) {
      log('❌ Coverage thresholds not met', 'red');
      return false;
    }
  }
  
  log('✅ Coverage report generated successfully', 'green');
  return true;
}

async function runAllTests() {
  log('🚀 Starting Comprehensive Test Suite', 'bright');
  log('=====================================', 'bright');
  
  const startTime = Date.now();
  const results = {
    linting: false,
    typeChecking: false,
    unitTests: false,
    apiTests: false,
    e2eTests: false,
    coverage: false
  };
  
  try {
    // Run linting first
    results.linting = await runLinting();
    if (!results.linting) {
      log('\n❌ Linting failed, stopping execution', 'red');
      return false;
    }
    
    // Run type checking
    results.typeChecking = await runTypeChecking();
    if (!results.typeChecking) {
      log('\n❌ Type checking failed, stopping execution', 'red');
      return false;
    }
    
    // Run unit tests
    results.unitTests = await runUnitTests();
    if (!results.unitTests) {
      log('\n❌ Unit tests failed, stopping execution', 'red');
      return false;
    }
    
    // Run API tests
    results.apiTests = await runApiTests();
    if (!results.apiTests) {
      log('\n❌ API tests failed, stopping execution', 'red');
      return false;
    }
    
    // Run E2E tests
    results.e2eTests = await runE2ETests();
    if (!results.e2eTests) {
      log('\n❌ E2E tests failed, stopping execution', 'red');
      return false;
    }
    
    // Generate coverage report
    results.coverage = await generateCoverageReport();
    if (!results.coverage) {
      log('\n❌ Coverage requirements not met', 'red');
      return false;
    }
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log('\n🎉 All Tests Passed!', 'green');
    log('===================', 'green');
    log(`⏱️  Total time: ${duration}s`, 'cyan');
    log(`✅ Linting: ${results.linting ? 'PASS' : 'FAIL'}`, results.linting ? 'green' : 'red');
    log(`✅ Type Checking: ${results.typeChecking ? 'PASS' : 'FAIL'}`, results.typeChecking ? 'green' : 'red');
    log(`✅ Unit Tests: ${results.unitTests ? 'PASS' : 'FAIL'}`, results.unitTests ? 'green' : 'red');
    log(`✅ API Tests: ${results.apiTests ? 'PASS' : 'FAIL'}`, results.apiTests ? 'green' : 'red');
    log(`✅ E2E Tests: ${results.e2eTests ? 'PASS' : 'FAIL'}`, results.e2eTests ? 'green' : 'red');
    log(`✅ Coverage: ${results.coverage ? 'PASS' : 'FAIL'}`, results.coverage ? 'green' : 'red');
    
    return true;
    
  } catch (error) {
    log(`\n❌ Test suite failed with error: ${error.message}`, 'red');
    return false;
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'unit':
      await runUnitTests();
      break;
    case 'api':
      await runApiTests();
      break;
    case 'e2e':
      await runE2ETests();
      break;
    case 'lint':
      await runLinting();
      break;
    case 'type-check':
      await runTypeChecking();
      break;
    case 'coverage':
      await generateCoverageReport();
      break;
    case 'all':
    default:
      const success = await runAllTests();
      process.exit(success ? 0 : 1);
      break;
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    log(`❌ Unexpected error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runUnitTests,
  runApiTests,
  runE2ETests,
  runLinting,
  runTypeChecking,
  generateCoverageReport,
  runAllTests
};










