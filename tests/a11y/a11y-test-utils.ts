import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
import { Page } from '@playwright/test';

export interface A11yTestConfig {
  skipRules?: string[];
  include?: string[];
  exclude?: string[];
  tags?: string[];
}

export class A11yTestHelper {
  private page: Page;
  private config: A11yTestConfig;

  constructor(page: Page, config: A11yTestConfig = {}) {
    this.page = page;
    this.config = {
      skipRules: [],
      include: ['main', '[role="main"]'],
      exclude: ['[data-testid="print-preview"]', '[data-testid="receipt-preview"]'],
      tags: ['wcag2a', 'wcag2aa'],
      ...config
    };
  }

  async setupAxe() {
    await injectAxe(this.page);
  }

  async runA11yCheck(selector?: string) {
    const options = {
      rules: this.getRuleConfig(),
      include: this.config.include,
      exclude: this.config.exclude,
      tags: this.config.tags
    };

    if (selector) {
      await checkA11y(this.page, selector, options);
    } else {
      await checkA11y(this.page, null, options);
    }
  }

  async getViolations(selector?: string) {
    const options = {
      rules: this.getRuleConfig(),
      include: this.config.include,
      exclude: this.config.exclude,
      tags: this.config.tags
    };

    return await getViolations(this.page, selector, options);
  }

  private getRuleConfig() {
    const rules: Record<string, any> = {};
    
    // Disable skipped rules
    this.config.skipRules?.forEach(rule => {
      rules[rule] = { enabled: false };
    });

    return rules;
  }

  async generateA11yReport(violations: any[]) {
    if (violations.length === 0) {
      return '✅ No accessibility violations found';
    }

    let report = `❌ Found ${violations.length} accessibility violation(s):\n\n`;
    
    violations.forEach((violation, index) => {
      report += `${index + 1}. ${violation.id}: ${violation.description}\n`;
      report += `   Impact: ${violation.impact}\n`;
      report += `   Help: ${violation.help}\n`;
      report += `   Help URL: ${violation.helpUrl}\n`;
      
      if (violation.nodes && violation.nodes.length > 0) {
        report += `   Nodes:\n`;
        violation.nodes.forEach((node: any, nodeIndex: number) {
          report += `     ${nodeIndex + 1}. ${node.target.join(' ')}\n`;
          if (node.failureSummary) {
            report += `        ${node.failureSummary}\n`;
          }
        });
      }
      report += '\n';
    });

    return report;
  }
}

// Critical violations that should fail CI
export const CRITICAL_A11Y_RULES = [
  'color-contrast',
  'keyboard-navigation', 
  'focus-order-semantics',
  'aria-required-attributes',
  'aria-valid-attr-value',
  'aria-valid-attr',
  'button-name',
  'label',
  'link-name',
  'html-has-lang',
  'html-lang-valid',
  'image-alt',
  'form-field-multiple-labels',
  'duplicate-id',
  'heading-order',
  'landmark-one-main',
  'page-has-heading-one',
  'tabindex',
  'interactive-controls',
  'keyboard',
  'nested-interactive'
];

// Skip rules with justification
export const A11Y_SKIP_RULES = {
  'color-contrast-enhanced': {
    reason: 'POS systems use high contrast by design for readability',
    justification: 'Thermal printers and POS displays require specific contrast ratios'
  },
  'video-caption': {
    reason: 'POS system does not use video content',
    justification: 'No video elements in POS interface'
  },
  'video-description': {
    reason: 'POS system does not use video content',
    justification: 'No video elements in POS interface'
  }
};



