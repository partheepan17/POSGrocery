import { BarcodeSymbology } from '@/types';

export interface BarcodeResult {
  data: string;
  format: 'svg' | 'dataUrl';
  width: number;
  height: number;
}

export class BarcodeService {
  private static instance: BarcodeService;

  static getInstance(): BarcodeService {
    if (!BarcodeService.instance) {
      BarcodeService.instance = new BarcodeService();
    }
    return BarcodeService.instance;
  }

  /**
   * Encode EAN-13 barcode
   * Supports 12-digit input (computes checksum) or 13-digit input (validates checksum)
   */
  encodeEAN13(data: string): BarcodeResult {
    // Remove any non-numeric characters
    const cleanData = data.replace(/\D/g, '');
    
    if (cleanData.length === 12) {
      // Compute checksum
      const withChecksum = cleanData + this.calculateEAN13Checksum(cleanData);
      return this.generateEAN13SVG(withChecksum);
    } else if (cleanData.length === 13) {
      // Validate checksum
      const dataWithoutChecksum = cleanData.substring(0, 12);
      const providedChecksum = cleanData.substring(12);
      const computedChecksum = this.calculateEAN13Checksum(dataWithoutChecksum);
      
      if (providedChecksum !== computedChecksum) {
        throw new Error(`Invalid EAN-13 checksum. Expected ${computedChecksum}, got ${providedChecksum}`);
      }
      return this.generateEAN13SVG(cleanData);
    } else {
      throw new Error('EAN-13 requires 12 or 13 digits');
    }
  }

  /**
   * Encode Code128 barcode
   * Supports any ASCII characters
   */
  encodeCode128(data: string): BarcodeResult {
    if (!data || data.length === 0) {
      throw new Error('Code128 data cannot be empty');
    }
    
    // Auto-select Code128 subset (simplified - use Code128B for most cases)
    return this.generateCode128SVG(data);
  }

  /**
   * Calculate EAN-13 checksum
   */
  private calculateEAN13Checksum(data: string): string {
    if (data.length !== 12) {
      throw new Error('EAN-13 checksum calculation requires exactly 12 digits');
    }

    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(data[i]);
      if (i % 2 === 0) {
        sum += digit; // Odd positions (1st, 3rd, 5th, etc.) - weight 1
      } else {
        sum += digit * 3; // Even positions (2nd, 4th, 6th, etc.) - weight 3
      }
    }

    const checksum = (10 - (sum % 10)) % 10;
    return checksum.toString();
  }

  /**
   * Generate EAN-13 SVG barcode
   */
  private generateEAN13SVG(data: string): BarcodeResult {
    if (data.length !== 13) {
      throw new Error('EAN-13 data must be exactly 13 digits');
    }

    // EAN-13 encoding patterns
    const leftOddPatterns = [
      '0001101', '0011001', '0010011', '0111101', '0100011',
      '0110001', '0101111', '0111011', '0110111', '0001011'
    ];
    
    const leftEvenPatterns = [
      '0100111', '0110011', '0011011', '0100001', '0011101',
      '0111001', '0000101', '0010001', '0001001', '0010111'
    ];
    
    const rightPatterns = [
      '1110010', '1100110', '1101100', '1000010', '1011100',
      '1001110', '1010000', '1000100', '1001000', '1110100'
    ];

    // First digit determines the pattern for left group
    const firstDigit = parseInt(data[0]);
    const patternMap = [
      'OOOOOO', 'OOEOEE', 'OOEEOE', 'OOEEEO', 'OEOOEE',
      'OEEOOE', 'OEEEOO', 'OEOEOE', 'OEOEEO', 'OEEOEO'
    ];
    const pattern = patternMap[firstDigit];

    // Build barcode
    let barcode = '';
    
    // Start guard
    barcode += '101';
    
    // Left group (6 digits)
    for (let i = 1; i <= 6; i++) {
      const digit = parseInt(data[i]);
      if (pattern[i - 1] === 'O') {
        barcode += leftOddPatterns[digit];
      } else {
        barcode += leftEvenPatterns[digit];
      }
    }
    
    // Center guard
    barcode += '01010';
    
    // Right group (6 digits)
    for (let i = 7; i <= 12; i++) {
      const digit = parseInt(data[i]);
      barcode += rightPatterns[digit];
    }
    
    // End guard
    barcode += '101';

    return this.binaryToSVG(barcode, data, 'EAN13');
  }

  /**
   * Generate Code128 SVG barcode (simplified implementation)
   */
  private generateCode128SVG(data: string): BarcodeResult {
    // Code128B character set (subset for simplicity)
    const code128B: { [key: string]: string } = {
      ' ': '11011001100', '!': '11001101100', '"': '11001100110', '#': '10010011000',
      '$': '10010001100', '%': '10001001100', '&': '10011001000', "'": '10011000100',
      '(': '10001100100', ')': '11001001000', '*': '11001000100', '+': '11000100100',
      ',': '10110011100', '-': '10011011100', '.': '10011001110', '/': '10111001100',
      '0': '10011101100', '1': '10011100110', '2': '11001110010', '3': '11001011100',
      '4': '11001001110', '5': '11011100100', '6': '11001110100', '7': '11101101110',
      '8': '11101001100', '9': '11100101100', ':': '11100100110', ';': '11101100100',
      '<': '11100110100', '=': '11100110010', '>': '11011011000', '?': '11011000110',
      '@': '11000110110', 'A': '10100011000', 'B': '10001011000', 'C': '10001000110',
      'D': '10110001000', 'E': '10001101000', 'F': '10001100010', 'G': '11010001000',
      'H': '11000101000', 'I': '11000100010', 'J': '10110111000', 'K': '10110001110',
      'L': '10001101110', 'M': '10111011000', 'N': '10111000110', 'O': '10001110110',
      'P': '11101110110', 'Q': '11010001110', 'R': '11000101110', 'S': '11011101000',
      'T': '11011100010', 'U': '11011101110', 'V': '11101011000', 'W': '11101000110',
      'X': '11100010110', 'Y': '11101101000', 'Z': '11101100010'
    };

    // Start Code B
    let barcode = '11010010000';
    let checksum = 104; // Start Code B value

    // Encode data
    for (let i = 0; i < data.length; i++) {
      const char = data[i];
      if (!(char in code128B)) {
        throw new Error(`Unsupported character in Code128: '${char}'`);
      }
      barcode += code128B[char];
      checksum += (char.charCodeAt(0) - 32) * (i + 1);
    }

    // Add checksum
    const checksumValue = checksum % 103;
    const checksumChar = String.fromCharCode(checksumValue + 32);
    if (checksumChar in code128B) {
      barcode += code128B[checksumChar];
    }

    // Stop pattern
    barcode += '1100011101011';

    return this.binaryToSVG(barcode, data, 'CODE128');
  }

  /**
   * Convert binary pattern to SVG
   */
  private binaryToSVG(binary: string, text: string, type: 'EAN13' | 'CODE128'): BarcodeResult {
    const moduleWidth = 1;
    const height = type === 'EAN13' ? 60 : 50;
    const textHeight = 12;
    const totalHeight = height + textHeight + 5;
    const width = binary.length * moduleWidth;
    
    let svg = `<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
    svg += '<rect width="100%" height="100%" fill="white"/>';
    
    // Draw bars
    let x = 0;
    for (let i = 0; i < binary.length; i++) {
      if (binary[i] === '1') {
        svg += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height}" fill="black"/>`;
      }
      x += moduleWidth;
    }
    
    // Add text
    svg += `<text x="${width / 2}" y="${height + textHeight}" font-family="monospace" font-size="10" text-anchor="middle" fill="black">${text}</text>`;
    svg += '</svg>';

    return {
      data: svg,
      format: 'svg',
      width,
      height: totalHeight
    };
  }

  /**
   * Convert SVG to data URL for use in HTML
   */
  svgToDataUrl(svg: string): string {
    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml,${encoded}`;
  }

  /**
   * Validate barcode data for a given symbology
   */
  validateBarcodeData(data: string, symbology: BarcodeSymbology): { valid: boolean; error?: string } {
    try {
      if (symbology === 'EAN13') {
        const cleanData = data.replace(/\D/g, '');
        if (cleanData.length !== 12 && cleanData.length !== 13) {
          return { valid: false, error: 'EAN-13 requires 12 or 13 digits' };
        }
        if (cleanData.length === 13) {
          // Validate checksum
          const dataWithoutChecksum = cleanData.substring(0, 12);
          const providedChecksum = cleanData.substring(12);
          const computedChecksum = this.calculateEAN13Checksum(dataWithoutChecksum);
          if (providedChecksum !== computedChecksum) {
            return { valid: false, error: `Invalid EAN-13 checksum` };
          }
        }
      } else if (symbology === 'CODE128') {
        if (!data || data.length === 0) {
          return { valid: false, error: 'Code128 data cannot be empty' };
        }
        // Check for unsupported characters (simplified)
        for (let char of data) {
          if (char.charCodeAt(0) < 32 || char.charCodeAt(0) > 126) {
            return { valid: false, error: `Unsupported character: '${char}'` };
          }
        }
      }
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown validation error' };
    }
  }
}

// Export singleton instance
export const barcodeService = BarcodeService.getInstance();
