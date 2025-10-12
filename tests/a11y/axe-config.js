// axe-core configuration for accessibility testing
module.exports = {
  // Rules to run
  rules: {
    // Critical violations that should fail CI
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'aria-required-attributes': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-allowed-role': { enabled: true },
    'aria-unsupported-elements': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-input-field-name': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'aria-text': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'color-contrast-enhanced': { enabled: true },
    'color-contrast': { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id': { enabled: true },
    'duplicate-id-aria': { enabled: true },
    'duplicate-id-active': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'html-xml-lang-mismatch': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'marquee': { enabled: true },
    'meta-refresh': { enabled: true },
    'object-alt': { enabled: true },
    'role-img-alt': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'select-name': { enabled: true },
    'server-side-image-map': { enabled: true },
    'svg-img-alt': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true },
    'video-description': { enabled: true },
    'bypass': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-one-main': { enabled: true },
    'landmark-unique': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'tabindex': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'interactive-controls': { enabled: true },
    'keyboard': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'nested-interactive': { enabled: true },
    'no-autoplay-audio': { enabled: true },
    'no-conflicting-role': { enabled: true },
    'no-redundant-roles': { enabled: true },
    'presentation-role-conflict': { enabled: true },
    'role-img-alt': { enabled: true },
    'scope-attr-valid': { enabled: true },
    'table-duplicate-name': { enabled: true },
    'table-fake-caption': { enabled: true },
    'td-has-header': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true },
    'video-description': { enabled: true },
    'xml-namespace': { enabled: true }
  },
  
  // Tags to include
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
  
  // Skip rules with justification
  skipRules: {
    // Skip rules that are not applicable to POS systems
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
  },
  
  // Exclude certain elements from testing
  exclude: [
    // Exclude third-party components that we can't control
    '[data-testid="third-party-component"]',
    // Exclude print preview modals
    '[data-testid="print-preview"]',
    // Exclude receipt preview areas
    '[data-testid="receipt-preview"]'
  ],
  
  // Include only specific elements for focused testing
  include: [
    'main',
    '[role="main"]',
    '[data-testid="pos-interface"]',
    '[data-testid="sales-page"]',
    '[data-testid="returns-page"]',
    '[data-testid="drawer-ops"]'
  ]
};



