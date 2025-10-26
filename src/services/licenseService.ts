import { db } from './database';
import { LicenseInfo, CompanyProfile } from '../types';

export class LicenseService {
  async getLicenseInfo(): Promise<LicenseInfo | null> {
    try {
      const rows = await db.query('SELECT * FROM license_info WHERE id = 1');
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        license_key: row.license_key || '',
        company_name: row.company_name || '',
        valid_until: row.valid_until || '',
        features: row.features ? JSON.parse(row.features) : [],
        max_terminals: row.max_terminals || 1,
        active: row.active || false
      } as LicenseInfo;
    } catch (error) {
      console.error('Error getting license info:', error);
      return null;
    }
  }

  async getCompanyProfile(): Promise<CompanyProfile | null> {
    try {
      const rows = await db.query('SELECT * FROM company_profile WHERE id = 1');
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        name: row.name || '',
        address: row.address || '',
        phone: row.phone || '',
        email: row.email || '',
        tax_id: row.tax_id || '',
        license_key: row.license_key || ''
      } as CompanyProfile;
    } catch (error) {
      console.error('Error getting company profile:', error);
      return null;
    }
  }

  async updateCompanyProfile(profile: Partial<CompanyProfile>): Promise<boolean> {
    try {
      // Check if license is locked
      const licenseInfo = await this.getLicenseInfo();
      if (licenseInfo?.active) {
        throw new Error('Company settings are locked under license. Contact administrator for changes.');
      }

      const currentProfile = await this.getCompanyProfile();
      if (!currentProfile) {
        throw new Error('Company profile not found');
      }

      const updatedProfile = {
        ...currentProfile,
        ...profile,
        updatedAt: new Date()
      };

      await db.run(
        'UPDATE company_profile SET name = ?, address = ?, taxId = ?, contactEmail = ?, contactPhone = ?, logoUrl = ?, updatedAt = ? WHERE id = 1',
        [
          updatedProfile.name,
          updatedProfile.address,
          updatedProfile.tax_id || '',
          updatedProfile.email || '',
          updatedProfile.phone || '',
          updatedProfile.name || '',
          updatedProfile.updatedAt.toISOString()
        ]
      );

      return true;
    } catch (error) {
      console.error('Error updating company profile:', error);
      throw error;
    }
  }

  async isLicenseLocked(): Promise<boolean> {
    try {
      const licenseInfo = await this.getLicenseInfo();
      return licenseInfo?.active || false;
    } catch (error) {
      console.error('Error checking license status:', error);
      return true;
    }
  }

  async getProductName(): Promise<string> {
    try {
      const licenseInfo = await this.getLicenseInfo();
      return licenseInfo?.company_name || 'viRtual POS';
    } catch (error) {
      console.error('Error getting product name:', error);
      return 'viRtual POS';
    }
  }

  async getLicenseeInfo(): Promise<{ licensee: string; fullName: string }> {
    try {
      const licenseInfo = await this.getLicenseInfo();
      return {
        licensee: licenseInfo?.company_name || 'Virtual Software Pvt Ltd',
        fullName: licenseInfo?.company_name || 'Visual Interface Resource Technology Unified Analytics Labs'
      };
    } catch (error) {
      console.error('Error getting licensee info:', error);
      return {
        licensee: 'Virtual Software Pvt Ltd',
        fullName: 'Visual Interface Resource Technology Unified Analytics Labs'
      };
    }
  }
}

export const licenseService = new LicenseService();

