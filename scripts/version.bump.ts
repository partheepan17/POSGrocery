#!/usr/bin/env tsx
/**
 * Version Bump Script
 * Bumps semantic version in package.json and updates CHANGELOG.md
 * 
 * Usage: npm run version:bump -- <patch|minor|major>
 */

import fs from 'fs';
import path from 'path';

interface PackageJson {
  name: string;
  version: string;
  [key: string]: any;
}

type VersionType = 'patch' | 'minor' | 'major';

class VersionBumper {
  private packageJsonPath: string;
  private changelogPath: string;

  constructor() {
    this.packageJsonPath = path.resolve(process.cwd(), 'package.json');
    this.changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
  }

  /**
   * Parse semantic version string
   */
  private parseVersion(version: string): [number, number, number] {
    const cleanVersion = version.replace(/^v/, '');
    const parts = cleanVersion.split('.').map(Number);
    
    if (parts.length !== 3 || parts.some(isNaN)) {
      throw new Error(`Invalid version format: ${version}`);
    }
    
    return parts as [number, number, number];
  }

  /**
   * Bump version according to semver rules
   */
  private bumpVersion(currentVersion: string, type: VersionType): string {
    const [major, minor, patch] = this.parseVersion(currentVersion);
    
    switch (type) {
      case 'major':
        return `${major + 1}.0.0`;
      case 'minor':
        return `${major}.${minor + 1}.0`;
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      default:
        throw new Error(`Invalid version type: ${type}`);
    }
  }

  /**
   * Update package.json with new version
   */
  private updatePackageJson(newVersion: string): void {
    console.log('📦 Updating package.json...');
    
    if (!fs.existsSync(this.packageJsonPath)) {
      throw new Error('package.json not found');
    }
    
    const packageJson: PackageJson = JSON.parse(
      fs.readFileSync(this.packageJsonPath, 'utf-8')
    );
    
    const oldVersion = packageJson.version;
    packageJson.version = newVersion;
    
    fs.writeFileSync(
      this.packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n'
    );
    
    console.log(`   ✓ Updated version: ${oldVersion} → ${newVersion}`);
  }

  /**
   * Add new section to CHANGELOG.md
   */
  private updateChangelog(newVersion: string): void {
    console.log('📝 Updating CHANGELOG.md...');
    
    if (!fs.existsSync(this.changelogPath)) {
      console.log('   ⚠️  CHANGELOG.md not found, creating new one');
      this.createInitialChangelog(newVersion);
      return;
    }
    
    const changelog = fs.readFileSync(this.changelogPath, 'utf-8');
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Create new version section
    const newSection = this.createVersionSection(newVersion, currentDate);
    
    // Find where to insert the new section
    const unreleasedIndex = changelog.indexOf('## [Unreleased]');
    
    if (unreleasedIndex !== -1) {
      // Insert after unreleased section
      const afterUnreleased = changelog.indexOf('\n', unreleasedIndex + 15);
      const updatedChangelog = 
        changelog.slice(0, afterUnreleased + 1) +
        '\n' + newSection + '\n' +
        changelog.slice(afterUnreleased + 1);
      
      fs.writeFileSync(this.changelogPath, updatedChangelog);
    } else {
      // Insert at the beginning after title
      const titleEnd = changelog.indexOf('\n\n') + 2;
      const updatedChangelog = 
        changelog.slice(0, titleEnd) +
        newSection + '\n\n' +
        changelog.slice(titleEnd);
      
      fs.writeFileSync(this.changelogPath, updatedChangelog);
    }
    
    console.log(`   ✓ Added v${newVersion} section to CHANGELOG.md`);
  }

  /**
   * Create initial CHANGELOG.md if it doesn't exist
   */
  private createInitialChangelog(version: string): void {
    const currentDate = new Date().toISOString().split('T')[0];
    const content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

${this.createVersionSection(version, currentDate)}
`;
    
    fs.writeFileSync(this.changelogPath, content);
    console.log(`   ✓ Created CHANGELOG.md with v${version} section`);
  }

  /**
   * Create a new version section template
   */
  private createVersionSection(version: string, date: string): string {
    return `## [${version}] - ${date}

### Added
- 

### Changed
- 

### Deprecated
- 

### Removed
- 

### Fixed
- 

### Security
- `;
  }

  /**
   * Generate git commands for the user
   */
  private generateGitCommands(version: string): void {
    console.log('\n🔧 Next steps:');
    console.log('Run the following commands to commit and tag the release:\n');
    
    console.log('   git add .');
    console.log(`   git commit -m "chore(release): v${version}"`);
    console.log(`   git tag v${version}`);
    console.log('   git push --follow-tags');
    
    console.log('\n📝 Don\'t forget to:');
    console.log('   1. Update the CHANGELOG.md with actual changes');
    console.log('   2. Update docs/RELEASE_NOTES_TEMPLATE.md');
    console.log('   3. Run npm run release:notes to finalize changelog');
  }

  /**
   * Validate version type argument
   */
  private validateVersionType(type: string): VersionType {
    if (!['patch', 'minor', 'major'].includes(type)) {
      throw new Error(`Invalid version type: ${type}. Must be patch, minor, or major.`);
    }
    return type as VersionType;
  }

  /**
   * Main execution method
   */
  async execute(versionType: string): Promise<void> {
    try {
      console.log('🚀 Starting version bump process...\n');
      
      // Validate input
      const type = this.validateVersionType(versionType);
      
      // Read current version
      const packageJson: PackageJson = JSON.parse(
        fs.readFileSync(this.packageJsonPath, 'utf-8')
      );
      const currentVersion = packageJson.version;
      
      // Calculate new version
      const newVersion = this.bumpVersion(currentVersion, type);
      
      console.log(`📊 Version bump: ${currentVersion} → ${newVersion} (${type})`);
      
      // Update files
      this.updatePackageJson(newVersion);
      this.updateChangelog(newVersion);
      
      // Generate next steps
      this.generateGitCommands(newVersion);
      
      console.log('\n✅ Version bump completed successfully!');
      
    } catch (error) {
      console.error('\n❌ Version bump failed:');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 1) {
    console.error('Usage: npm run version:bump -- <patch|minor|major>');
    console.error('');
    console.error('Examples:');
    console.error('  npm run version:bump -- patch   # 1.0.0 → 1.0.1');
    console.error('  npm run version:bump -- minor   # 1.0.0 → 1.1.0');
    console.error('  npm run version:bump -- major   # 1.0.0 → 2.0.0');
    process.exit(1);
  }
  
  const versionType = args[0];
  const bumper = new VersionBumper();
  
  await bumper.execute(versionType);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { VersionBumper };








