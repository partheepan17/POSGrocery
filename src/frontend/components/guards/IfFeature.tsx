/**
 * IfFeature Component
 * Conditionally renders children based on feature availability
 */

import React from 'react';
import { useFeatures } from '@/frontend/state/features/useFeatures';

interface IfFeatureProps {
  code: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, requires all features to be enabled
  requireAny?: boolean; // If true, requires any feature to be enabled
  features?: string[]; // Additional features to check
  invert?: boolean; // If true, renders when feature is disabled
}

/**
 * IfFeature - Renders children only if the specified feature is enabled
 */
export const IfFeature: React.FC<IfFeatureProps> = ({
  code,
  children,
  fallback = null,
  requireAll = false,
  requireAny = false,
  features = [],
  invert = false
}) => {
  const { hasFeature: checkFeature, hasAllFeatures, hasAnyFeature } = useFeatures();
  const hasFeature = checkFeature(code);

  // Determine if we should render
  let shouldRender = hasFeature;

  if (features.length > 0) {
    if (requireAll) {
      shouldRender = hasAllFeatures([code, ...features]);
    } else if (requireAny) {
      shouldRender = hasAnyFeature([code, ...features]);
    } else {
      // Default behavior: all features must be enabled
      shouldRender = hasAllFeatures([code, ...features]);
    }
  }

  // Apply invert logic
  if (invert) {
    shouldRender = !shouldRender;
  }

  return shouldRender ? <>{children}</> : <>{fallback}</>;
};

/**
 * IfNotFeature - Renders children only if the specified feature is disabled
 */
export const IfNotFeature: React.FC<Omit<IfFeatureProps, 'invert'>> = (props) => {
  return <IfFeature {...props} invert={true} />;
};

/**
 * IfAllFeatures - Renders children only if all specified features are enabled
 */
export const IfAllFeatures: React.FC<Omit<IfFeatureProps, 'requireAll' | 'requireAny'>> = (props) => {
  return <IfFeature {...props} requireAll={true} />;
};

/**
 * IfAnyFeature - Renders children only if any specified feature is enabled
 */
export const IfAnyFeature: React.FC<Omit<IfFeatureProps, 'requireAll' | 'requireAny'>> = (props) => {
  return <IfFeature {...props} requireAny={true} />;
};

export default IfFeature;

