/**
 * Guard Components
 * Easy-to-use guard components for conditional rendering
 */

// Feature guards
export { 
  IfFeature, 
  IfNotFeature, 
  IfAllFeatures, 
  IfAnyFeature,
  default as IfFeatureDefault
} from './IfFeature';

// Permission guards
export { 
  IfPerm, 
  IfNotPerm, 
  IfAllPerms, 
  IfAnyPerm,
  IfRole,
  IfAdmin,
  IfManager,
  IfCashier,
  default as IfPermDefault
} from './IfPerm';

// Advanced guards
export { 
  Guard,
  FeatureGuard,
  PermissionGuard,
  RoleGuard,
  AdminGuard,
  ManagerGuard,
  default as GuardDefault
} from './Guard';

// Re-export types
export type { default as IfFeatureProps } from './IfFeature';
export type { default as IfPermProps } from './IfPerm';
export type { default as GuardProps } from './Guard';










