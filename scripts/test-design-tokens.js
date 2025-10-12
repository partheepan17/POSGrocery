#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 Testing Design Tokens Enforcement...\n');

// Test files with intentional violations
const testFiles = [
  {
    name: 'raw-colors.tsx',
    content: `
import React from 'react';

export function TestComponent() {
  return (
    <div>
      <div style={{ color: '#ff0000' }}>Red text</div>
      <div style={{ backgroundColor: 'rgb(0, 255, 0)' }}>Green background</div>
      <div style={{ borderColor: 'rgba(0, 0, 255, 0.5)' }}>Blue border</div>
      <div style={{ color: '#000' }}>Black text</div>
    </div>
  );
}
`,
    expectedErrors: 4
  },
  {
    name: 'raw-spacing.tsx',
    content: `
import React from 'react';

export function TestComponent() {
  return (
    <div>
      <div style={{ padding: '10px' }}>10px padding</div>
      <div style={{ margin: '15px' }}>15px margin</div>
      <div style={{ gap: '20px' }}>20px gap</div>
    </div>
  );
}
`,
    expectedErrors: 3
  },
  {
    name: 'raw-font-sizes.tsx',
    content: `
import React from 'react';

export function TestComponent() {
  return (
    <div>
      <div style={{ fontSize: '14px' }}>14px text</div>
      <div style={{ fontSize: '18px' }}>18px text</div>
      <div style={{ fontSize: '24px' }}>24px text</div>
    </div>
  );
}
`,
    expectedErrors: 3
  },
  {
    name: 'raw-border-radius.tsx',
    content: `
import React from 'react';

export function TestComponent() {
  return (
    <div>
      <div style={{ borderRadius: '5px' }}>5px radius</div>
      <div style={{ borderRadius: '10px' }}>10px radius</div>
      <div style={{ borderRadius: '15px' }}>15px radius</div>
    </div>
  );
}
`,
    expectedErrors: 3
  },
  {
    name: 'correct-usage.tsx',
    content: `
import React from 'react';

export function TestComponent() {
  return (
    <div className="p-4 m-2 bg-primary-500 text-white rounded-lg">
      <h1 className="text-pos-xl font-bold">Correct usage</h1>
      <p className="text-pos-base text-gray-600">Using design tokens</p>
    </div>
  );
}
`,
    expectedErrors: 0
  }
];

// Create test directory
const testDir = path.join(__dirname, '..', 'temp-design-tokens-test');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

let totalTests = 0;
let passedTests = 0;

console.log('Creating test files...\n');

// Create test files
testFiles.forEach(file => {
  const filePath = path.join(testDir, file.name);
  fs.writeFileSync(filePath, file.content);
  console.log(`✅ Created ${file.name}`);
});

console.log('\nRunning ESLint on test files...\n');

// Test each file
testFiles.forEach(file => {
  totalTests++;
  const filePath = path.join(testDir, file.name);
  
  try {
    // Run ESLint on the file
    const result = execSync(`npx eslint "${filePath}" --format=json`, { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..')
    });
    
    const output = JSON.parse(result);
    const errorCount = output[0]?.messages?.filter(msg => msg.severity === 2).length || 0;
    
    if (errorCount === file.expectedErrors) {
      console.log(`✅ ${file.name}: Found ${errorCount} errors (expected ${file.expectedErrors})`);
      passedTests++;
    } else {
      console.log(`❌ ${file.name}: Found ${errorCount} errors (expected ${file.expectedErrors})`);
    }
  } catch (error) {
    // ESLint returns non-zero exit code when errors are found
    const output = error.stdout || error.stderr || '';
    try {
      const result = JSON.parse(output);
      const errorCount = result[0]?.messages?.filter(msg => msg.severity === 2).length || 0;
      
      if (errorCount === file.expectedErrors) {
        console.log(`✅ ${file.name}: Found ${errorCount} errors (expected ${file.expectedErrors})`);
        passedTests++;
      } else {
        console.log(`❌ ${file.name}: Found ${errorCount} errors (expected ${file.expectedErrors})`);
      }
    } catch (parseError) {
      console.log(`❌ ${file.name}: Failed to parse ESLint output`);
    }
  }
});

// Clean up test files
console.log('\nCleaning up test files...');
fs.rmSync(testDir, { recursive: true, force: true });

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Design Tokens Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All design token enforcement tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Check the ESLint configuration.');
  process.exit(1);
}



