/**
 * Generate PWA icons from SVG
 * This is a simple script to create placeholder icons
 */

const fs = require('fs');
const path = require('path');

// Create a simple PNG-like data URL for different sizes
function createIconData(size) {
  // This is a simple base64 encoded 1x1 pixel PNG
  // In a real implementation, you'd use a proper image processing library
  const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="240" fill="#3b82f6" stroke="#1e40af" stroke-width="8"/>
      <rect x="128" y="160" width="256" height="160" rx="16" fill="#ffffff" stroke="#1e40af" stroke-width="4"/>
      <rect x="144" y="176" width="224" height="96" rx="8" fill="#1e40af"/>
      <rect x="160" y="192" width="192" height="8" rx="4" fill="#ffffff"/>
      <rect x="160" y="208" width="144" height="8" rx="4" fill="#ffffff"/>
      <rect x="160" y="224" width="128" height="8" rx="4" fill="#ffffff"/>
      <rect x="160" y="240" width="96" height="8" rx="4" fill="#ffffff"/>
      <circle cx="200" y="300" r="12" fill="#ffffff" stroke="#1e40af" stroke-width="2"/>
      <circle cx="240" y="300" r="12" fill="#ffffff" stroke="#1e40af" stroke-width="2"/>
      <circle cx="280" y="300" r="12" fill="#ffffff" stroke="#1e40af" stroke-width="2"/>
      <circle cx="320" y="300" r="12" fill="#ffffff" stroke="#1e40af" stroke-width="2"/>
      <path d="M80 200 L120 200 L140 240 L180 240 L200 200 L240 200" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="160" cy="280" r="16" fill="#ffffff" stroke="#1e40af" stroke-width="3"/>
      <circle cx="200" cy="280" r="16" fill="#ffffff" stroke="#1e40af" stroke-width="3"/>
      <text x="256" y="400" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#ffffff">$</text>
    </svg>
  `;
  
  return canvas;
}

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons for each size
sizes.forEach(size => {
  const iconContent = createIconData(size);
  const filename = `icon-${size}x${size}.svg`;
  const filepath = path.join(iconsDir, filename);
  
  fs.writeFileSync(filepath, iconContent);
  console.log(`Generated ${filename}`);
});

// Create a simple favicon
const faviconContent = createIconData(32);
fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), faviconContent);
console.log('Generated favicon.svg');

// Create apple-touch-icon
const appleTouchIcon = createIconData(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleTouchIcon);
console.log('Generated apple-touch-icon.svg');

console.log('\n✅ All PWA icons generated successfully!');
console.log('Note: These are SVG icons. For production, convert to PNG format.');











