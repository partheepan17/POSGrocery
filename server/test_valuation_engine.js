/**
 * Test Runner for Valuation Engine
 * Runs comprehensive unit tests for the valuation engine
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Running Valuation Engine Unit Tests\n');

try {
  // Run the tests using vitest
  const testCommand = 'npx vitest run tests/valuationEngine.test.ts --reporter=verbose';
  
  console.log('📋 Test Command:', testCommand);
  console.log('⏳ Running tests...\n');
  
  const output = execSync(testCommand, { 
    cwd: __dirname,
    encoding: 'utf8',
    stdio: 'inherit'
  });
  
  console.log('\n✅ All tests completed successfully!');
  
} catch (error) {
  console.error('\n❌ Test execution failed:');
  console.error(error.message);
  process.exit(1);
}
