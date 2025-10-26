/**
 * Features State Management
 * Centralized state management for features and permissions
 */

// Main exports
export { FeatureProvider, useFeatures, useFeature, usePermission } from './FeatureProvider';
export { 
  useFeatures as useFeaturesHook,
  useFeature as useFeatureHook,
  usePermission as usePermissionHook,
  useFeatures as useMultipleFeatures,
  usePermissions as useMultiplePermissions,
  useFeatureCheck,
  usePermissionCheck,
  useFeatureSummary,
  useUserRole,
  useIsAdmin,
  useIsManager,
  useIsCashier,
  type FeatureCheckResult,
  type PermissionCheckResult,
  type FeatureSummary
} from './useFeatures';

// Re-export types
export type { FeatureState, FeatureContextType } from './FeatureProvider';

// Default export
export { default } from './FeatureProvider';










