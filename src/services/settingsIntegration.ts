import { AppSettings } from '@/types';
import { SettingsValidationService } from './settingsValidation';

export class SettingsIntegrationService {
  private static instance: SettingsIntegrationService;
  private settings: AppSettings | null = null;

  private constructor() {}

  static getInstance(): SettingsIntegrationService {
    if (!SettingsIntegrationService.instance) {
      SettingsIntegrationService.instance = new SettingsIntegrationService();
    }
    return SettingsIntegrationService.instance;
  }

  // Update settings and apply changes immediately
  updateSettings(newSettings: AppSettings): void {
    this.settings = newSettings;
    this.applySettingsChanges();
  }

  // Apply all settings changes to the running application
  private applySettingsChanges(): void {
    if (!this.settings) return;

    // Apply theme changes
    this.applyTheme();

    // Apply language changes
    this.applyLanguage();

    // Apply rounding changes
    this.applyRounding();

    // Apply receipt settings
    this.applyReceiptSettings();

    // Apply device settings
    this.applyDeviceSettings();

    // Apply pricing policies
    this.applyPricingPolicies();

    // Notify other services of settings changes
    this.notifySettingsChange();
  }

  private applyTheme(): void {
    if (!this.settings) return;

    const theme = this.settings.theme;
    const root = document.documentElement;

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // Auto theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }

  private applyLanguage(): void {
    if (!this.settings) return;

    // Update document language
    document.documentElement.lang = this.settings.languageFormatting.displayLanguage.toLowerCase();

    // Update currency symbol in CSS variables
    const root = document.documentElement;
    root.style.setProperty('--currency-symbol', this.settings.currencySymbol);
  }

  private applyRounding(): void {
    if (!this.settings) return;

    // Create global rounding function
    (window as any).applyRounding = SettingsValidationService.applyRoundingMode(
      this.settings.languageFormatting.roundingMode
    );

    // Update any visible totals in the POS
    this.updateVisibleTotals();
  }

  private applyReceiptSettings(): void {
    if (!this.settings) return;

    // Update receipt preview components
    const receiptPreviewEvent = new CustomEvent('receiptSettingsChanged', {
      detail: {
        paper: this.settings.receiptOptions,
        language: this.settings.storeInfo.defaultReceiptLanguage,
        showQR: this.settings.receiptOptions.showQRCode,
        showBarcode: this.settings.receiptOptions.showBarcode,
        showTierBadge: this.settings.receiptOptions.showTierBadge,
        footerTexts: {
          EN: this.settings.receiptOptions.footerTextEN,
          SI: this.settings.receiptOptions.footerTextSI,
          TA: this.settings.receiptOptions.footerTextTA,
        }
      }
    });
    window.dispatchEvent(receiptPreviewEvent);
  }

  private applyDeviceSettings(): void {
    if (!this.settings) return;

    // Update device configuration
    const deviceSettingsEvent = new CustomEvent('deviceSettingsChanged', {
      detail: {
        receiptPaper: this.settings.devices.receiptPaper,
        cashDrawerOpenOnCash: this.settings.devices.cashDrawerOpenOnCash,
        scaleMode: this.settings.devices.scaleMode,
      }
    });
    window.dispatchEvent(deviceSettingsEvent);
  }

  private applyPricingPolicies(): void {
    if (!this.settings) return;

    // Update pricing validation
    const pricingEvent = new CustomEvent('pricingPoliciesChanged', {
      detail: {
        missingPricePolicy: this.settings.pricingPolicies.missingPricePolicy,
        requiredTiers: this.settings.pricingPolicies.requiredTiers,
        autoCreateCategories: this.settings.pricingPolicies.autoCreateCategories,
        autoCreateSuppliers: this.settings.pricingPolicies.autoCreateSuppliers,
      }
    });
    window.dispatchEvent(pricingEvent);
  }

  private updateVisibleTotals(): void {
    // Update any visible totals in the POS interface
    const totalElements = document.querySelectorAll('[data-currency-total]');
    totalElements.forEach(element => {
      const currentValue = parseFloat(element.textContent?.replace(/[^\d.-]/g, '') || '0');
      if (currentValue > 0 && (window as any).applyRounding) {
        const roundedValue = (window as any).applyRounding(currentValue);
        element.textContent = `${this.settings?.currencySymbol || 'රු'} ${roundedValue.toFixed(2)}`;
      }
    });
  }

  private notifySettingsChange(): void {
    // Notify other parts of the application that settings have changed
    const settingsChangeEvent = new CustomEvent('settingsChanged', {
      detail: {
        timestamp: new Date().toISOString(),
        settings: this.settings
      }
    });
    window.dispatchEvent(settingsChangeEvent);
  }

  // Helper methods for POS integration
  shouldOpenCashDrawer(paymentAmount: number): boolean {
    if (!this.settings) return false;
    return SettingsValidationService.shouldOpenCashDrawer(
      paymentAmount,
      this.settings.devices.cashDrawerOpenOnCash
    );
  }

  getReceiptLanguage(): string {
    if (!this.settings) return 'EN';
    return this.settings.storeInfo.defaultReceiptLanguage;
  }

  formatAmount(amount: number): string {
    if (!this.settings) return amount.toFixed(2);
    
    const roundedAmount = SettingsValidationService.applyRoundingMode(
      this.settings.languageFormatting.roundingMode
    )(amount);
    
    return `${this.settings.currencySymbol} ${roundedAmount.toFixed(2)}`;
  }

  formatWeight(weight: number): string {
    if (!this.settings) return weight.toFixed(2);
    return SettingsValidationService.formatWeight(weight, this.settings.languageFormatting.kgDecimals);
  }

  getRequiredPriceTiers(): string[] {
    if (!this.settings) return ['retail'];
    return this.settings.pricingPolicies.requiredTiers;
  }

  getMissingPricePolicy(): string {
    if (!this.settings) return 'warn_fallback';
    return this.settings.pricingPolicies.missingPricePolicy;
  }

  shouldAutoCreateCategories(): boolean {
    if (!this.settings) return true;
    return this.settings.pricingPolicies.autoCreateCategories;
  }

  shouldAutoCreateSuppliers(): boolean {
    if (!this.settings) return true;
    return this.settings.pricingPolicies.autoCreateSuppliers;
  }

  // Backup integration
  scheduleBackup(): void {
    if (!this.settings) return;

    const { schedule, provider } = this.settings.backupSettings;
    
    if (provider === 'local') {
      // Schedule local backup
      this.scheduleLocalBackup(schedule.dailyTime);
    } else {
      // Schedule cloud backup
      this.scheduleCloudBackup(schedule.dailyTime, provider);
    }
  }

  private scheduleLocalBackup(time: string): void {
    // Implementation for local backup scheduling
    console.log(`Scheduling local backup for ${time}`);
  }

  private scheduleCloudBackup(time: string, provider: string): void {
    // Implementation for cloud backup scheduling
    console.log(`Scheduling ${provider} backup for ${time}`);
  }
}

// Export singleton instance
export const settingsIntegration = SettingsIntegrationService.getInstance();









