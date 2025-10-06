#!/usr/bin/env tsx
/**
 * Changelog Generator Script
 * Compiles unreleased notes into CHANGELOG.md and finalizes version sections
 * 
 * Usage: 
 *   npm run release:notes                    # Update unreleased section
 *   npm run release:notes -- --finalize vX.Y.Z  # Finalize version section
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface ChangelogEntry {
  type: 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';
  description: string;
  prNumber?: string;
  author?: string;
}

interface ReleaseNotes {
  version?: string;
  date?: string;
  highlights: string[];
  changes: ChangelogEntry[];
}

class ChangelogGenerator {
  private changelogPath: string;
  private releaseNotesPath: string;
  private packageJsonPath: string;

  constructor() {
    this.changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');
    this.releaseNotesPath = path.resolve(process.cwd(), 'docs/RELEASE_NOTES_TEMPLATE.md');
    this.packageJsonPath = path.resolve(process.cwd(), 'package.json');
  }

  /**
   * Get git commits since last tag
   */
  private getCommitsSinceLastTag(): string[] {
    try {
      // Get the last tag
      const lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
      console.log(`📍 Last tag: ${lastTag}`);
      
      // Get commits since last tag
      const commits = execSync(
        `git log ${lastTag}..HEAD --pretty=format:"%h|%s|%an"`,
        { encoding: 'utf-8' }
      ).trim();
      
      return commits ? commits.split('\n') : [];
    } catch (error) {
      console.log('⚠️  No previous tags found, using all commits');
      
      // Get all commits if no tags exist
      try {
        const commits = execSync(
          'git log --pretty=format:"%h|%s|%an"',
          { encoding: 'utf-8' }
        ).trim();
        
        return commits ? commits.split('\n') : [];
      } catch (gitError) {
        console.log('⚠️  No git history found');
        return [];
      }
    }
  }

  /**
   * Parse commit message to extract type and description
   */
  private parseCommitMessage(message: string): ChangelogEntry | null {
    // Skip merge commits and version bumps
    if (message.includes('Merge') || message.includes('chore(release)')) {
      return null;
    }

    // Parse conventional commit format: type(scope): description
    const conventionalMatch = message.match(/^(feat|fix|docs|style|refactor|test|chore)(\([^)]+\))?: (.+)$/);
    
    if (conventionalMatch) {
      const [, type, , description] = conventionalMatch;
      
      switch (type) {
        case 'feat':
          return { type: 'Added', description };
        case 'fix':
          return { type: 'Fixed', description };
        case 'docs':
          return { type: 'Changed', description: `Documentation: ${description}` };
        case 'refactor':
          return { type: 'Changed', description: `Refactor: ${description}` };
        default:
          return { type: 'Changed', description };
      }
    }

    // Parse simple format for other commits
    if (message.toLowerCase().includes('fix') || message.toLowerCase().includes('bug')) {
      return { type: 'Fixed', description: message };
    }
    
    if (message.toLowerCase().includes('add') || message.toLowerCase().includes('new')) {
      return { type: 'Added', description: message };
    }
    
    if (message.toLowerCase().includes('remove') || message.toLowerCase().includes('delete')) {
      return { type: 'Removed', description: message };
    }
    
    if (message.toLowerCase().includes('security') || message.toLowerCase().includes('vulnerability')) {
      return { type: 'Security', description: message };
    }
    
    return { type: 'Changed', description: message };
  }

  /**
   * Generate changelog entries from git commits
   */
  private generateEntriesFromCommits(): ChangelogEntry[] {
    const commits = this.getCommitsSinceLastTag();
    const entries: ChangelogEntry[] = [];
    
    console.log(`📝 Processing ${commits.length} commits...`);
    
    for (const commit of commits) {
      const [hash, message, author] = commit.split('|');
      const entry = this.parseCommitMessage(message);
      
      if (entry) {
        entry.author = author;
        entries.push(entry);
      }
    }
    
    console.log(`   ✓ Generated ${entries.length} changelog entries`);
    return entries;
  }

  /**
   * Read release notes template
   */
  private readReleaseNotesTemplate(): ReleaseNotes {
    if (!fs.existsSync(this.releaseNotesPath)) {
      console.log('⚠️  Release notes template not found, using generated entries only');
      return {
        highlights: [],
        changes: this.generateEntriesFromCommits()
      };
    }

    const content = fs.readFileSync(this.releaseNotesPath, 'utf-8');
    
    // Parse highlights from template
    const highlightsMatch = content.match(/## ✨ Highlights\n\n(.*?)\n\n## /s);
    const highlights = highlightsMatch 
      ? highlightsMatch[1].split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(2))
      : [];

    // Combine template highlights with generated entries
    const generatedEntries = this.generateEntriesFromCommits();
    
    return {
      highlights,
      changes: generatedEntries
    };
  }

  /**
   * Group changelog entries by type
   */
  private groupEntriesByType(entries: ChangelogEntry[]): Record<string, ChangelogEntry[]> {
    const grouped: Record<string, ChangelogEntry[]> = {
      'Added': [],
      'Changed': [],
      'Deprecated': [],
      'Removed': [],
      'Fixed': [],
      'Security': []
    };

    for (const entry of entries) {
      grouped[entry.type].push(entry);
    }

    return grouped;
  }

  /**
   * Format changelog section
   */
  private formatChangelogSection(type: string, entries: ChangelogEntry[]): string {
    if (entries.length === 0) {
      return `### ${type}\n- \n`;
    }

    const lines = entries.map(entry => `- ${entry.description}`);
    return `### ${type}\n${lines.join('\n')}\n`;
  }

  /**
   * Update unreleased section in CHANGELOG.md
   */
  private updateUnreleasedSection(releaseNotes: ReleaseNotes): void {
    console.log('📝 Updating [Unreleased] section...');
    
    if (!fs.existsSync(this.changelogPath)) {
      throw new Error('CHANGELOG.md not found. Run version:bump first.');
    }

    const changelog = fs.readFileSync(this.changelogPath, 'utf-8');
    const grouped = this.groupEntriesByType(releaseNotes.changes);
    
    // Find unreleased section
    const unreleasedStart = changelog.indexOf('## [Unreleased]');
    if (unreleasedStart === -1) {
      throw new Error('[Unreleased] section not found in CHANGELOG.md');
    }

    const nextSectionStart = changelog.indexOf('## [', unreleasedStart + 15);
    const unreleasedEnd = nextSectionStart === -1 ? changelog.length : nextSectionStart;

    // Create new unreleased content
    const newUnreleasedContent = `## [Unreleased]

${Object.entries(grouped)
  .map(([type, entries]) => this.formatChangelogSection(type, entries))
  .join('\n')}`;

    // Replace unreleased section
    const updatedChangelog = 
      changelog.slice(0, unreleasedStart) +
      newUnreleasedContent +
      (nextSectionStart === -1 ? '' : '\n' + changelog.slice(nextSectionStart));

    fs.writeFileSync(this.changelogPath, updatedChangelog);
    console.log('   ✓ Updated [Unreleased] section with generated entries');
  }

  /**
   * Finalize version section (convert unreleased to versioned)
   */
  private finalizeVersionSection(version: string): void {
    console.log(`🏷️  Finalizing version section for v${version}...`);
    
    if (!fs.existsSync(this.changelogPath)) {
      throw new Error('CHANGELOG.md not found');
    }

    const changelog = fs.readFileSync(this.changelogPath, 'utf-8');
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Replace [Unreleased] with version and date
    const versionedChangelog = changelog.replace(
      /## \[Unreleased\]/,
      `## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

## [${version}] - ${currentDate}`
    );

    fs.writeFileSync(this.changelogPath, versionedChangelog);
    console.log(`   ✓ Finalized v${version} section with date ${currentDate}`);
  }

  /**
   * Get current version from package.json
   */
  private getCurrentVersion(): string {
    const packageJson = JSON.parse(fs.readFileSync(this.packageJsonPath, 'utf-8'));
    return packageJson.version;
  }

  /**
   * Main execution method
   */
  async execute(options: { finalize?: string } = {}): Promise<void> {
    try {
      console.log('📰 Starting changelog generation...\n');

      if (options.finalize) {
        // Finalize specific version
        this.finalizeVersionSection(options.finalize);
        console.log(`\n✅ Finalized changelog for v${options.finalize}`);
      } else {
        // Update unreleased section
        const releaseNotes = this.readReleaseNotesTemplate();
        this.updateUnreleasedSection(releaseNotes);
        console.log('\n✅ Updated [Unreleased] section with latest changes');
        
        console.log('\n📝 Next steps:');
        console.log('   1. Review and edit CHANGELOG.md entries');
        console.log('   2. Update docs/RELEASE_NOTES_TEMPLATE.md with highlights');
        console.log('   3. Run npm run release:notes -- --finalize vX.Y.Z when ready');
      }

    } catch (error) {
      console.error('\n❌ Changelog generation failed:');
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options: { finalize?: string } = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--finalize' && args[i + 1]) {
      options.finalize = args[i + 1].replace(/^v/, ''); // Remove 'v' prefix if present
      i++; // Skip next argument as it's the version
    }
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log('Changelog Generator');
    console.log('');
    console.log('Usage:');
    console.log('  npm run release:notes                    # Update [Unreleased] section');
    console.log('  npm run release:notes -- --finalize vX.Y.Z  # Finalize version section');
    console.log('');
    console.log('Options:');
    console.log('  --finalize vX.Y.Z    Finalize the changelog for the specified version');
    console.log('  --help, -h           Show this help message');
    return;
  }

  const generator = new ChangelogGenerator();
  await generator.execute(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { ChangelogGenerator };








