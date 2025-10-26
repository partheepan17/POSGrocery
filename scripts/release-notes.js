#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📝 Generating Release Notes...\n');

// Get git log since last tag
let lastTag;
try {
  lastTag = execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
} catch (error) {
  lastTag = 'HEAD~10'; // Fallback to last 10 commits
}

const gitLog = execSync(`git log ${lastTag}..HEAD --pretty=format:"%h %s"`, { encoding: 'utf8' });

// Parse commits
const commits = gitLog.trim().split('\n').map(line => {
  const [hash, ...messageParts] = line.split(' ');
  return {
    hash,
    message: messageParts.join(' ')
  };
});

// Categorize commits
const categories = {
  feat: { title: '✨ Features', commits: [] },
  fix: { title: '🐛 Bug Fixes', commits: [] },
  perf: { title: '⚡ Performance', commits: [] },
  docs: { title: '📚 Documentation', commits: [] },
  style: { title: '💄 Style', commits: [] },
  refactor: { title: '♻️ Refactoring', commits: [] },
  test: { title: '🧪 Tests', commits: [] },
  chore: { title: '🔧 Chores', commits: [] },
  other: { title: '📦 Other', commits: [] }
};

commits.forEach(commit => {
  const type = commit.message.match(/^(feat|fix|perf|docs|style|refactor|test|chore)(\(.+\))?:/);
  if (type) {
    const category = type[1];
    if (categories[category]) {
      categories[category].commits.push(commit);
    } else {
      categories.other.commits.push(commit);
    }
  } else {
    categories.other.commits.push(commit);
  }
});

// Generate release notes
const version = process.argv[2] || 'v1.0.0';
const date = new Date().toISOString().split('T')[0];

let releaseNotes = `# Release ${version} (${date})\n\n`;

// Add summary
const totalCommits = commits.length;
const featureCount = categories.feat.commits.length;
const fixCount = categories.fix.commits.length;

releaseNotes += `## Summary\n\n`;
releaseNotes += `- **${totalCommits}** commits\n`;
releaseNotes += `- **${featureCount}** new features\n`;
releaseNotes += `- **${fixCount}** bug fixes\n\n`;

// Add categorized changes
Object.values(categories).forEach(category => {
  if (category.commits.length > 0) {
    releaseNotes += `## ${category.title}\n\n`;
    category.commits.forEach(commit => {
      releaseNotes += `- ${commit.message} (${commit.hash})\n`;
    });
    releaseNotes += '\n';
  }
});

// Add breaking changes
const breakingChanges = commits.filter(commit => 
  commit.message.includes('BREAKING CHANGE') || commit.message.includes('!')
);

if (breakingChanges.length > 0) {
  releaseNotes += `## ⚠️ Breaking Changes\n\n`;
  breakingChanges.forEach(commit => {
    releaseNotes += `- ${commit.message} (${commit.hash})\n`;
  });
  releaseNotes += '\n';
}

// Add migration notes
releaseNotes += `## 🔄 Migration Notes\n\n`;
releaseNotes += `If you're upgrading from a previous version, please check the following:\n\n`;
releaseNotes += `- [ ] Review breaking changes above\n`;
releaseNotes += `- [ ] Update environment variables if needed\n`;
releaseNotes += `- [ ] Run database migrations\n`;
releaseNotes += `- [ ] Test in staging environment\n\n`;

// Add installation notes
releaseNotes += `## 🚀 Installation\n\n`;
releaseNotes += `\`\`\`bash\n`;
releaseNotes += `# Install dependencies\n`;
releaseNotes += `npm install\n\n`;
releaseNotes += `# Run migrations\n`;
releaseNotes += `npm run migrate\n\n`;
releaseNotes += `# Start the application\n`;
releaseNotes += `npm start\n`;
releaseNotes += `\`\`\`\n\n`;

// Add contributors
try {
  const contributors = execSync(`git log ${lastTag}..HEAD --pretty=format:"%an" | sort | uniq`, { encoding: 'utf8' });
  const contributorList = contributors.trim().split('\n').filter(Boolean);
  
  if (contributorList.length > 0) {
    releaseNotes += `## 👥 Contributors\n\n`;
    contributorList.forEach(contributor => {
      releaseNotes += `- ${contributor}\n`;
    });
    releaseNotes += '\n';
  }
} catch (error) {
  // Ignore errors
}

// Save release notes
const releaseNotesPath = `RELEASE_NOTES_${version.replace('v', '')}.md`;
fs.writeFileSync(releaseNotesPath, releaseNotes);

console.log(`✅ Release notes generated: ${releaseNotesPath}`);
console.log(`📊 Summary: ${totalCommits} commits, ${featureCount} features, ${fixCount} fixes`);










