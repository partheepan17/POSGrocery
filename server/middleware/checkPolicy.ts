import { Request, Response, NextFunction } from 'express';
import { PolicyService, PolicyCheck } from '../services/policyService';

export function checkPolicy(policyService: PolicyService, policy: PolicyCheck) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.headers['x-tenant-id'] as string || 'default';

      const hasAccess = await policyService.checkPolicy(policy, userId, tenantId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          required: policy
        });
      }

      next();
    } catch (error) {
      console.error('Policy check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Policy check error'
      });
    }
  };
}

export function requireFeature(featureName: string) {
  return (policyService: PolicyService) => 
    checkPolicy(policyService, { feature: featureName });
}

export function requirePermission(permissionName: string) {
  return (policyService: PolicyService) => 
    checkPolicy(policyService, { permission: permissionName });
}

export function requireResourceAction(resource: string, action: string) {
  return (policyService: PolicyService) => 
    checkPolicy(policyService, { resource, action });
}










