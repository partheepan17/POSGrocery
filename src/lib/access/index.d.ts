/**
 * Access Control Module
 * Exports all access control utilities and services
 */
export { FeatureCache, featureCache } from './FeatureCache';
export { AccessPolicy, accessPolicy, AccessPolicyError, type User, type PolicyCheck, type PolicyError } from './policy';
export { FeatureDependencyManager, dependencyManager, DependencyError, type DependencyChain, type DependencyValidation } from './dependency';
export type { TenantFeatureFlag, RoleFeatureOverride, FeatureDependency, CachedFeatureData } from './FeatureCache';
