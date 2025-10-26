#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Bumping Version...\n');

const versionType = process.argv[2] || 'patch'; // patch, minor, major

if (!['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ Invalid version type. Use: patch, minor, or major');
  process.exit(1);
}

// Read current package.json
const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Parse current version
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newVersion;
switch (versionType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`📈 Bumping version: ${currentVersion} → ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

// Update other files that might contain version
const filesToUpdate = [
  'src/version.ts',
  'server/version.ts'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      /export const VERSION = ['"`][^'"`]*['"`]/,
      `export const VERSION = '${newVersion}'`
    );
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${file}`);
  }
});

// Create git tag
try {
  execSync(`git add package.json ${filesToUpdate.join(' ')}`, { stdio: 'inherit' });
  execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
  execSync(`git tag -a v${newVersion} -m "Release ${newVersion}"`, { stdio: 'inherit' });
  console.log(`✅ Created git tag v${newVersion}`);
} catch (error) {
  console.error('❌ Failed to create git tag:', error.message);
  process.exit(1);
}

console.log(`\n🎉 Version bumped to ${newVersion}`);
console.log(`📝 Don't forget to run: git push origin main --tags`);










