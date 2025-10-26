import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { useFeatures } from '@/frontend/state/features/useFeatures';

interface ImpactPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cascade: boolean) => void;
  featureCode: string;
  featureName: string;
  isEnabling: boolean;
  blockingDependents?: string[];
  cascadeTargets?: string[];
  isLoading?: boolean;
}

export const ImpactPreviewModal: React.FC<ImpactPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  featureCode,
  featureName,
  isEnabling,
  blockingDependents = [],
  cascadeTargets = [],
  isLoading = false
}) => {
  const { } = useFeatures();
  const [cascadeConfirmed, setCascadeConfirmed] = useState(false);
  const [dependencies, setDependencies] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && featureCode) {
      setDependencies([]); // Simplified - no dependencies for now
      setCascadeConfirmed(false);
    }
  }, [isOpen, featureCode]);

  const hasBlockingDependents = blockingDependents.length > 0;
  const hasCascadeTargets = cascadeTargets.length > 0;
  const canProceed = isEnabling || !hasBlockingDependents || (hasBlockingDependents && cascadeConfirmed);

  const handleConfirm = () => {
    onConfirm(cascadeConfirmed);
    onClose();
  };

  const getImpactIcon = () => {
    if (isEnabling) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (hasBlockingDependents && !cascadeConfirmed) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (hasBlockingDependents && cascadeConfirmed) {
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  const getImpactTitle = () => {
    if (isEnabling) {
      return `Enable ${featureName}`;
    }
    if (hasBlockingDependents && !cascadeConfirmed) {
      return `Cannot Disable ${featureName}`;
    }
    if (hasBlockingDependents && cascadeConfirmed) {
      return `Disable ${featureName} with Cascade`;
    }
    return `Disable ${featureName}`;
  };

  const getImpactDescription = () => {
    if (isEnabling) {
      return `This will enable the ${featureName} feature for all users in your organization.`;
    }
    if (hasBlockingDependents && !cascadeConfirmed) {
      return `This feature cannot be disabled because it has enabled dependents that rely on it.`;
    }
    if (hasBlockingDependents && cascadeConfirmed) {
      return `This will disable ${featureName} and all its dependent features. This action cannot be undone.`;
    }
    return `This will disable the ${featureName} feature for all users in your organization.`;
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getImpactIcon()}
            {getImpactTitle()}
          </DialogTitle>
          <DialogDescription>
            {getImpactDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dependencies Section */}
          {dependencies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Dependencies</h4>
              <div className="flex flex-wrap gap-2">
                {dependencies.map((dep) => (
                  <Badge key={dep} variant="outline" className="text-xs">
                    {dep}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Blocking Dependents Alert */}
          {hasBlockingDependents && !cascadeConfirmed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>The following features depend on this feature and are currently enabled:</p>
                  <div className="flex flex-wrap gap-1">
                    {blockingDependents.map((dep) => (
                      <Badge key={dep} variant="destructive" className="text-xs">
                        {dep}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm">
                    You must disable these features first, or use cascade disable to disable them all at once.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Cascade Targets */}
          {hasCascadeTargets && (
            <div>
              <h4 className="text-sm font-medium mb-3">
                Features that will be disabled (Cascade)
              </h4>
              <ScrollArea className="h-32 w-full border rounded-md p-3">
                <div className="space-y-1">
                  {cascadeTargets.map((target) => (
                    <div key={target} className="flex items-center gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span>{target}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Cascade Confirmation */}
          {hasBlockingDependents && (
            <div className="space-y-3">
              <Separator />
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="cascade-confirm"
                  checked={cascadeConfirmed}
                  onChange={(e) => setCascadeConfirmed(e.target.checked)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <label
                    htmlFor="cascade-confirm"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I understand the impact and want to disable with cascade
                  </label>
                  <p className="text-xs text-muted-foreground">
                    This will disable {featureName} and {cascadeTargets.length} dependent features. 
                    This action cannot be undone and may affect user workflows.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning for Cascade */}
          {cascadeConfirmed && hasCascadeTargets && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will disable {cascadeTargets.length} dependent features. 
                Make sure this is what you want to do, as it may break existing functionality.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canProceed || isLoading}
            variant={hasBlockingDependents && cascadeConfirmed ? "destructive" : "default"}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                {isEnabling ? 'Enable' : 'Disable'} Feature
                {cascadeConfirmed && ' with Cascade'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

