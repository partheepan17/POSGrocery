/**
 * Configuration Service
 * Handles export/import of feature configurations per tenant
 */

// import { createContextLogger } from '../server/utils/logger';

// const logger = createContextLogger({ operation: 'configuration_service' });
const logger = {
  error: (message: string, data?: any) => console.error(message, data),
  info: (message: string, data?: any) => console.info(message, data),
  warn: (message: string, data?: any) => console.warn(message, data)
};

export interface FeatureConfiguration {
  featureCode: string;
  isEnabled: boolean;
  isCore: boolean;
  dependsOn: string[];
  category: string;
  name: string;
  description: string;
}

export interface RoleConfiguration {
  roleId: number;
  roleCode: string;
  roleName: string;
  permissions: string[];
  featureOverrides: {
    [featureCode: string]: boolean;
  };
}

export interface TenantConfiguration {
  tenantId: string;
  tenantName: string;
  exportedAt: string;
  version: string;
  features: FeatureConfiguration[];
  roles: RoleConfiguration[];
  settings: {
    defaultFeatureState: 'enabled' | 'disabled';
    allowCoreFeatureToggle: boolean;
    requireApprovalForChanges: boolean;
  };
}

export interface ImportResult {
  success: boolean;
  importedFeatures: number;
  importedRoles: number;
  errors: string[];
  warnings: string[];
  conflicts: {
    featureCode: string;
    currentState: boolean;
    importedState: boolean;
  }[];
}

class ConfigurationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
  }

  /**
   * Export current tenant configuration
   */
  async exportConfiguration(tenantId: string): Promise<TenantConfiguration> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/features/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-Tenant-ID': tenantId
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;

    } catch (error) {
      logger.error('Failed to export configuration', { tenantId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Import configuration for a tenant
   */
  async importConfiguration(
    tenantId: string, 
    configuration: TenantConfiguration,
    options: {
      overwriteExisting?: boolean;
      validateDependencies?: boolean;
      createMissingRoles?: boolean;
    } = {}
  ): Promise<ImportResult> {
    try {
      const response = await fetch(`${this.baseUrl}/admin/features/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-Tenant-ID': tenantId
        },
        body: JSON.stringify({
          configuration,
          options: {
            overwriteExisting: options.overwriteExisting ?? true,
            validateDependencies: options.validateDependencies ?? true,
            createMissingRoles: options.createMissingRoles ?? false
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data;

    } catch (error) {
      logger.error('Failed to import configuration', { tenantId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Download configuration as JSON file
   */
  async downloadConfiguration(tenantId: string, filename?: string): Promise<void> {
    try {
      const configuration = await this.exportConfiguration(tenantId);
      const jsonString = JSON.stringify(configuration, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `tenant-${tenantId}-config-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      logger.error('Failed to download configuration', { tenantId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Upload and import configuration from file
   */
  async uploadConfiguration(
    tenantId: string, 
    file: File,
    options?: {
      overwriteExisting?: boolean;
      validateDependencies?: boolean;
      createMissingRoles?: boolean;
    }
  ): Promise<ImportResult> {
    try {
      const text = await file.text();
      const configuration = JSON.parse(text) as TenantConfiguration;
      
      // Validate configuration structure
      this.validateConfiguration(configuration);
      
      return await this.importConfiguration(tenantId, configuration, options);

    } catch (error) {
      logger.error('Failed to upload configuration', { tenantId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Get configuration template
   */
  async getConfigurationTemplate(): Promise<Partial<TenantConfiguration>> {
    return {
      version: '1.0.0',
      settings: {
        defaultFeatureState: 'disabled',
        allowCoreFeatureToggle: false,
        requireApprovalForChanges: false
      },
      features: [],
      roles: []
    };
  }

  /**
   * Validate configuration structure
   */
  private validateConfiguration(configuration: TenantConfiguration): void {
    const requiredFields = ['tenantId', 'version', 'features', 'roles'];
    
    for (const field of requiredFields) {
      if (!(field in configuration)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!Array.isArray(configuration.features)) {
      throw new Error('Features must be an array');
    }

    if (!Array.isArray(configuration.roles)) {
      throw new Error('Roles must be an array');
    }

    // Validate feature structure
    for (const feature of configuration.features) {
      const requiredFeatureFields = ['featureCode', 'isEnabled', 'isCore'];
      for (const field of requiredFeatureFields) {
        if (!(field in feature)) {
          throw new Error(`Feature missing required field: ${field}`);
        }
      }
    }

    // Validate role structure
    for (const role of configuration.roles) {
      const requiredRoleFields = ['roleId', 'roleCode', 'roleName', 'permissions'];
      for (const field of requiredRoleFields) {
        if (!(field in role)) {
          throw new Error(`Role missing required field: ${field}`);
        }
      }
    }
  }

  /**
   * Compare configurations
   */
  compareConfigurations(
    current: TenantConfiguration, 
    imported: TenantConfiguration
  ): {
    addedFeatures: FeatureConfiguration[];
    removedFeatures: FeatureConfiguration[];
    modifiedFeatures: {
      feature: FeatureConfiguration;
      changes: {
        field: string;
        current: any;
        imported: any;
      }[];
    }[];
    addedRoles: RoleConfiguration[];
    removedRoles: RoleConfiguration[];
    modifiedRoles: {
      role: RoleConfiguration;
      changes: {
        field: string;
        current: any;
        imported: any;
      }[];
    }[];
  } {
    const result = {
      addedFeatures: [] as FeatureConfiguration[],
      removedFeatures: [] as FeatureConfiguration[],
      modifiedFeatures: [] as any[],
      addedRoles: [] as RoleConfiguration[],
      removedRoles: [] as RoleConfiguration[],
      modifiedRoles: [] as any[]
    };

    // Compare features
    const currentFeatures = new Map(current.features.map(f => [f.featureCode, f]));
    const importedFeatures = new Map(imported.features.map(f => [f.featureCode, f]));

    for (const [code, importedFeature] of importedFeatures) {
      const currentFeature = currentFeatures.get(code);
      if (!currentFeature) {
        result.addedFeatures.push(importedFeature);
      } else {
        const changes = this.compareObjects(currentFeature, importedFeature);
        if (changes.length > 0) {
          result.modifiedFeatures.push({
            feature: importedFeature,
            changes
          });
        }
      }
    }

    for (const [code, currentFeature] of currentFeatures) {
      if (!importedFeatures.has(code)) {
        result.removedFeatures.push(currentFeature);
      }
    }

    // Compare roles
    const currentRoles = new Map(current.roles.map(r => [r.roleCode, r]));
    const importedRoles = new Map(imported.roles.map(r => [r.roleCode, r]));

    for (const [code, importedRole] of importedRoles) {
      const currentRole = currentRoles.get(code);
      if (!currentRole) {
        result.addedRoles.push(importedRole);
      } else {
        const changes = this.compareObjects(currentRole, importedRole);
        if (changes.length > 0) {
          result.modifiedRoles.push({
            role: importedRole,
            changes
          });
        }
      }
    }

    for (const [code, currentRole] of currentRoles) {
      if (!importedRoles.has(code)) {
        result.removedRoles.push(currentRole);
      }
    }

    return result;
  }

  /**
   * Compare two objects and return differences
   */
  private compareObjects(current: any, imported: any): any[] {
    const changes: any[] = [];
    const allKeys = new Set([...Object.keys(current), ...Object.keys(imported)]);

    for (const key of allKeys) {
      if (JSON.stringify(current[key]) !== JSON.stringify(imported[key])) {
        changes.push({
          field: key,
          current: current[key],
          imported: imported[key]
        });
      }
    }

    return changes;
  }

  /**
   * Get authentication token
   */
  private getAuthToken(): string {
    return localStorage.getItem('authToken') || '';
  }
}

// Export singleton instance
export const configurationService = new ConfigurationService();
