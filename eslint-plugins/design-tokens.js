const { ESLintUtils } = require('@typescript-eslint/utils');

// Design tokens from tailwind.config.js
const DESIGN_TOKENS = {
  colors: {
    // Brand colors
    'primary-50': '#f0f9ff',
    'primary-100': '#e0f2fe',
    'primary-200': '#bae6fd',
    'primary-300': '#7dd3fc',
    'primary-400': '#38bdf8',
    'primary-500': '#0ea5e9',
    'primary-600': '#0284c7',
    'primary-700': '#0369a1',
    'primary-800': '#075985',
    'primary-900': '#0c4a6e',
    'primary-950': '#082f49',
    
    // POS-specific colors
    'pos-success': '#22c55e',
    'pos-warning': '#f59e0b',
    'pos-error': '#ef4444',
    'pos-info': '#3b82f6',
    'pos-accent': '#8b5cf6',
    
    // Semantic colors
    'success-50': '#f0fdf4',
    'success-100': '#dcfce7',
    'success-200': '#bbf7d0',
    'success-300': '#86efac',
    'success-400': '#4ade80',
    'success-500': '#22c55e',
    'success-600': '#16a34a',
    'success-700': '#15803d',
    'success-800': '#166534',
    'success-900': '#14532d',
    'success-950': '#052e16',
    
    'warning-50': '#fffbeb',
    'warning-100': '#fef3c7',
    'warning-200': '#fde68a',
    'warning-300': '#fcd34d',
    'warning-400': '#fbbf24',
    'warning-500': '#f59e0b',
    'warning-600': '#d97706',
    'warning-700': '#b45309',
    'warning-800': '#92400e',
    'warning-900': '#78350f',
    'warning-950': '#451a03',
    
    'danger-50': '#fef2f2',
    'danger-100': '#fee2e2',
    'danger-200': '#fecaca',
    'danger-300': '#fca5a5',
    'danger-400': '#f87171',
    'danger-500': '#ef4444',
    'danger-600': '#dc2626',
    'danger-700': '#b91c1c',
    'danger-800': '#991b1b',
    'danger-900': '#7f1d1d',
    'danger-950': '#450a0a',
    
    // Neutral colors
    'gray-50': '#f9fafb',
    'gray-100': '#f3f4f6',
    'gray-200': '#e5e7eb',
    'gray-300': '#d1d5db',
    'gray-400': '#9ca3af',
    'gray-500': '#6b7280',
    'gray-600': '#4b5563',
    'gray-700': '#374151',
    'gray-800': '#1f2937',
    'gray-900': '#111827',
    'gray-950': '#030712',
  },
  
  spacing: {
    '0.5': '0.125rem',   // 2px
    '1': '0.25rem',      // 4px
    '2': '0.5rem',       // 8px
    '3': '0.75rem',      // 12px
    '4': '1rem',         // 16px
    '5': '1.25rem',      // 20px
    '6': '1.5rem',       // 24px
    '8': '2rem',         // 32px
    '10': '2.5rem',      // 40px
    '12': '3rem',        // 48px
    '16': '4rem',        // 64px
    '20': '5rem',        // 80px
    '24': '6rem',        // 96px
    '32': '8rem',        // 128px
    '40': '10rem',       // 160px
    '48': '12rem',       // 192px
    '56': '14rem',       // 224px
    '64': '16rem',       // 256px
    '72': '18rem',       // 288px
    '80': '20rem',       // 320px
    '96': '24rem',       // 384px
    '18': '4.5rem',
    '88': '22rem',
    '128': '32rem',
  },
  
  fontSize: {
    'pos-xs': '0.75rem',
    'pos-sm': '0.875rem',
    'pos-base': '1rem',
    'pos-lg': '1.125rem',
    'pos-xl': '1.25rem',
    'pos-2xl': '1.5rem',
    'pos-3xl': '1.875rem',
    'pos-4xl': '2.25rem',
    'pos-5xl': '3rem',
    'pos-6xl': '3.75rem',
  },
  
  borderRadius: {
    'none': '0',
    'sm': '0.125rem',    // 2px
    'DEFAULT': '0.25rem', // 4px
    'md': '0.375rem',    // 6px
    'lg': '0.5rem',      // 8px
    'xl': '0.75rem',     // 12px
    '2xl': '1rem',       // 16px
    '3xl': '1.5rem',     // 24px
    'full': '9999px',
  }
};

// Create reverse lookup maps
const COLOR_TO_TOKEN = {};
const SPACING_TO_TOKEN = {};
const FONT_SIZE_TO_TOKEN = {};
const BORDER_RADIUS_TO_TOKEN = {};

Object.entries(DESIGN_TOKENS.colors).forEach(([token, value]) => {
  COLOR_TO_TOKEN[value.toLowerCase()] = token;
});

Object.entries(DESIGN_TOKENS.spacing).forEach(([token, value]) => {
  SPACING_TO_TOKEN[value] = token;
});

Object.entries(DESIGN_TOKENS.fontSize).forEach(([token, value]) => {
  FONT_SIZE_TO_TOKEN[value] = token;
});

Object.entries(DESIGN_TOKENS.borderRadius).forEach(([token, value]) => {
  BORDER_RADIUS_TO_TOKEN[value] = token;
});

// Helper functions
function isHexColor(value) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
}

function isRgbColor(value) {
  return /^rgb\(/.test(value) || /^rgba\(/.test(value);
}

function isHslColor(value) {
  return /^hsl\(/.test(value) || /^hsla\(/.test(value);
}

function isColorValue(value) {
  return isHexColor(value) || isRgbColor(value) || isHslColor(value);
}

function isSpacingValue(value) {
  return /^\d+(\.\d+)?(px|rem|em)$/.test(value);
}

function isFontSizeValue(value) {
  return /^\d+(\.\d+)?(px|rem|em)$/.test(value);
}

function isBorderRadiusValue(value) {
  return /^\d+(\.\d+)?(px|rem|em)$/.test(value) || value === '0';
}

function getTokenSuggestion(value, type) {
  const normalizedValue = value.toLowerCase();
  
  switch (type) {
    case 'color':
      return COLOR_TO_TOKEN[normalizedValue] || null;
    case 'spacing':
      return SPACING_TO_TOKEN[value] || null;
    case 'fontSize':
      return FONT_SIZE_TO_TOKEN[value] || null;
    case 'borderRadius':
      return BORDER_RADIUS_TO_TOKEN[value] || null;
    default:
      return null;
  }
}

module.exports = {
  rules: {
    'no-raw-colors': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow raw color values, use design tokens instead',
          category: 'Styling',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
          useDesignToken: 'Use design token "{{token}}" instead of raw color "{{value}}"',
          rawColorNotAllowed: 'Raw color values are not allowed. Use design tokens from the design system.',
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && isColorValue(node.value)) {
              const suggestion = getTokenSuggestion(node.value, 'color');
              
              context.report({
                node,
                messageId: suggestion ? 'useDesignToken' : 'rawColorNotAllowed',
                data: {
                  value: node.value,
                  token: suggestion || 'appropriate design token',
                },
                fix: suggestion ? (fixer) => {
                  return fixer.replaceText(node, `'${suggestion}'`);
                } : null,
              });
            }
          },
          JSXAttribute(node) {
            if (node.name.name === 'style' && node.value && node.value.type === 'Literal') {
              const styleValue = node.value.value;
              if (typeof styleValue === 'string') {
                // Check for color values in inline styles
                const colorMatches = styleValue.match(/#[A-Fa-f0-9]{6}|#[A-Fa-f0-9]{3}|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g);
                if (colorMatches) {
                  colorMatches.forEach(color => {
                    const suggestion = getTokenSuggestion(color, 'color');
                    context.report({
                      node,
                      messageId: suggestion ? 'useDesignToken' : 'rawColorNotAllowed',
                      data: {
                        value: color,
                        token: suggestion || 'appropriate design token',
                      },
                    });
                  });
                }
              }
            }
          },
        };
      },
    },
    
    'no-raw-spacing': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow raw spacing values, use design tokens instead',
          category: 'Styling',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
          useDesignToken: 'Use design token "{{token}}" instead of raw spacing "{{value}}"',
          rawSpacingNotAllowed: 'Raw spacing values are not allowed. Use design tokens from the design system.',
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && isSpacingValue(node.value)) {
              const suggestion = getTokenSuggestion(node.value, 'spacing');
              
              context.report({
                node,
                messageId: suggestion ? 'useDesignToken' : 'rawSpacingNotAllowed',
                data: {
                  value: node.value,
                  token: suggestion || 'appropriate design token',
                },
                fix: suggestion ? (fixer) => {
                  return fixer.replaceText(node, `'${suggestion}'`);
                } : null,
              });
            }
          },
        };
      },
    },
    
    'no-raw-font-sizes': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow raw font size values, use design tokens instead',
          category: 'Styling',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
          useDesignToken: 'Use design token "{{token}}" instead of raw font size "{{value}}"',
          rawFontSizeNotAllowed: 'Raw font size values are not allowed. Use design tokens from the design system.',
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && isFontSizeValue(node.value)) {
              const suggestion = getTokenSuggestion(node.value, 'fontSize');
              
              context.report({
                node,
                messageId: suggestion ? 'useDesignToken' : 'rawFontSizeNotAllowed',
                data: {
                  value: node.value,
                  token: suggestion || 'appropriate design token',
                },
                fix: suggestion ? (fixer) => {
                  return fixer.replaceText(node, `'${suggestion}'`);
                } : null,
              });
            }
          },
        };
      },
    },
    
    'no-raw-border-radius': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Disallow raw border radius values, use design tokens instead',
          category: 'Styling',
          recommended: true,
        },
        fixable: 'code',
        schema: [],
        messages: {
          useDesignToken: 'Use design token "{{token}}" instead of raw border radius "{{value}}"',
          rawBorderRadiusNotAllowed: 'Raw border radius values are not allowed. Use design tokens from the design system.',
        },
      },
      create(context) {
        return {
          Literal(node) {
            if (typeof node.value === 'string' && isBorderRadiusValue(node.value)) {
              const suggestion = getTokenSuggestion(node.value, 'borderRadius');
              
              context.report({
                node,
                messageId: suggestion ? 'useDesignToken' : 'rawBorderRadiusNotAllowed',
                data: {
                  value: node.value,
                  token: suggestion || 'appropriate design token',
                },
                fix: suggestion ? (fixer) => {
                  return fixer.replaceText(node, `'${suggestion}'`);
                } : null,
              });
            }
          },
        };
      },
    },
  },
};



