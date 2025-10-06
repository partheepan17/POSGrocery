import { db } from './database';
import { LicenseInfo, CompanyProfile } from '../types';

export class LicenseService {
  async getLicenseInfo(): Promise<LicenseInfo | null> {
    try {
      const rows = await db.query('SELECT * FROM license_info WHERE id = 1');
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        productName: row.productName,
        licensee: row.licensee,
        fullName: row.fullName,
        locked: row.locked,
        issuedAt: new Date(row.issuedAt)
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
        id: row.id,
        name: row.name,
        address: row.address,
        taxId: row.taxId,
        contactEmail: row.contactEmail,
        contactPhone: row.contactPhone,
        logoUrl: row.logoUrl,
        updatedAt: new Date(row.updatedAt)
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
      if (licenseInfo?.locked) {
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
          updatedProfile.taxId || '',
          updatedProfile.contactEmail || '',
          updatedProfile.contactPhone || '',
          updatedProfile.logoUrl || '',
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
      return licenseInfo?.locked || true;
    } catch (error) {
      console.error('Error checking license status:', error);
      return true;
    }
  }

  async getProductName(): Promise<string> {
    try {
      const licenseInfo = await this.getLicenseInfo();
      return licenseInfo?.productName || 'viRtual POS';
    } catch (error) {
      console.error('Error getting product name:', error);
      return 'viRtual POS';
    }
  }

  async getLicenseeInfo(): Promise<{ licensee: string; fullName: string }> {
    try {
      const licenseInfo = await this.getLicenseInfo();
      return {
        licensee: licenseInfo?.licensee || 'Virtual Software Pvt Ltd',
        fullName: licenseInfo?.fullName || 'Visual Interface Resource Technology Unified Analytics Labs'
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

