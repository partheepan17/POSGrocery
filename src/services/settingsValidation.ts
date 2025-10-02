import { AppSettings } from '@/types';

export interface ValidationError {
  field: string;
  message: string;
  section?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class SettingsValidationService {
  static validateStoreInfo(storeInfo: AppSettings['storeInfo']): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!storeInfo.name?.trim()) {
      errors.push({
        field: 'name',
        message: 'Store name is required',
        section: 'storeInfo'
      });
    }

    if (!storeInfo.address?.trim()) {
      errors.push({
        field: 'address',
        message: 'Store address is required',
        section: 'storeInfo'
      });
    }

    if (!storeInfo.taxId?.trim()) {
      errors.push({
        field: 'taxId',
        message: 'Tax/VAT ID is required',
        section: 'storeInfo'
      });
    }

    return errors;
  }

  static validateBackupSettings(backupSettings: AppSettings['backupSettings']): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate daily time format
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(backupSettings.schedule.dailyTime)) {
      errors.push({
        field: 'dailyTime',
        message: 'Invalid time format. Use HH:MM format (e.g., 22:30)',
        section: 'backupSettings'
      });
    }

    // Validate retention values
    if (backupSettings.retention.keepDaily < 1 || backupSettings.retention.keepDaily > 365) {
      errors.push({
        field: 'keepDaily',
        message: 'Daily retention must be between 1 and 365 days',
        section: 'backupSettings'
      });
    }

    if (backupSettings.retention.keepConfigChange < 1 || backupSettings.retention.keepConfigChange > 100) {
      errors.push({
        field: 'keepConfigChange',
        message: 'Config-change retention must be between 1 and 100 backups',
        section: 'backupSettings'
      });
    }

    // Validate provider credentials
    if (backupSettings.provider !== 'local') {
      const requiredCredentials = this.getRequiredCredentials(backupSettings.provider);
      const credentials = backupSettings.credentials || {};

      for (const cred of requiredCredentials) {
        if (!credentials[cred]?.trim()) {
          errors.push({
            field: cred,
            message: `${cred} is required for ${backupSettings.provider} provider`,
            section: 'backupSettings'
          });
        }
      }
    }

    return errors;
  }

  static validatePricingPolicies(pricingPolicies: AppSettings['pricingPolicies']): ValidationError[] {
    const errors: ValidationError[] = [];

    if (pricingPolicies.requiredTiers.length === 0) {
      errors.push({
        field: 'requiredTiers',
        message: 'At least one price tier must be required',
        section: 'pricingPolicies'
      });
    }

    return errors;
  }

  static validateLanguageFormatting(languageFormatting: AppSettings['languageFormatting']): ValidationError[] {
    const errors: ValidationError[] = [];

    if (languageFormatting.kgDecimals < 2 || languageFormatting.kgDecimals > 3) {
      errors.push({
        field: 'kgDecimals',
        message: 'Weight decimals must be between 2 and 3',
        section: 'languageFormatting'
      });
    }

    return errors;
  }

  static validateAllSettings(settings: AppSettings): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate each section
    errors.push(...this.validateStoreInfo(settings.storeInfo));
    errors.push(...this.validateBackupSettings(settings.backupSettings));
    errors.push(...this.validatePricingPolicies(settings.pricingPolicies));
    errors.push(...this.validateLanguageFormatting(settings.languageFormatting));

    // Add warnings for potential issues
    if (settings.storeInfo.logoUrl && !this.isValidUrl(settings.storeInfo.logoUrl)) {
      warnings.push({
        field: 'logoUrl',
        message: 'Logo URL may not be valid',
        section: 'storeInfo'
      });
    }

    if (settings.backupSettings.provider === 'local' && settings.backupSettings.schedule.onSettingsChange) {
      warnings.push({
        field: 'onSettingsChange',
        message: 'Settings-change backups may not be reliable with local storage',
        section: 'backupSettings'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private static getRequiredCredentials(provider: string): string[] {
    switch (provider) {
      case 'google_drive':
        return ['client_id', 'client_secret', 'refresh_token'];
      case 'onedrive':
        return ['client_id', 'client_secret', 'tenant_id'];
      case 's3':
        return ['access_key', 'secret_key', 'bucket_name', 'region'];
      case 'backblaze':
        return ['key_id', 'application_key', 'bucket_name'];
      default:
        return [];
    }
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Integration methods for immediate application
  static applyRoundingMode(roundingMode: string): (amount: number) => number {
    return (amount: number) => {
      switch (roundingMode) {
        case 'NEAREST_1':
          return Math.round(amount);
        case 'NEAREST_0_50':
          return Math.round(amount * 2) / 2;
        case 'NEAREST_0_10':
          return Math.round(amount * 10) / 10;
        default:
          return amount;
      }
    };
  }

  static shouldOpenCashDrawer(paymentAmount: number, drawerOnCash: boolean): boolean {
    return drawerOnCash && paymentAmount > 0;
  }

  static getReceiptLanguage(receiptLanguage: string, defaultLanguage: string): string {
    return receiptLanguage || defaultLanguage;
  }

  static formatWeight(weight: number, decimals: number): string {
    return weight.toFixed(decimals);
  }
}




