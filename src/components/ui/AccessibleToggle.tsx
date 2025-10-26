/**
 * Accessible Toggle Component
 * Provides keyboard navigation, ARIA attributes, and screen reader support
 */

import React, { forwardRef } from 'react';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Tooltip } from '@/components/ui/Tooltip';
import { Lock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccessibleToggleProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  tooltip?: string;
  isCore?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-labelledby'?: string;
}

export const AccessibleToggle = forwardRef<HTMLInputElement, AccessibleToggleProps>(
  ({
    id,
    checked,
    onCheckedChange,
    disabled = false,
    label,
    description,
    tooltip,
    isCore = false,
    className,
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    ...props
  }, ref) => {
    const toggleId = `toggle-${id}`;
    const labelId = `label-${id}`;
    const descriptionId = `description-${id}`;
    const tooltipId = `tooltip-${id}`;

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!disabled && !isCore) {
          onCheckedChange(!checked);
        }
      }
    };

    const toggleElement = (
      <div className={cn("flex items-center space-x-3", className)}>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Label
              id={labelId}
              htmlFor={toggleId}
              className={cn(
                "text-sm font-medium cursor-pointer",
                disabled && "text-muted-foreground cursor-not-allowed",
                isCore && "text-blue-600"
              )}
            >
              {label}
            </Label>
            {isCore && (
              <Tooltip content="Core feature - cannot be disabled">
                <Lock className="h-4 w-4 text-blue-500" aria-label="Core feature" />
              </Tooltip>
            )}
            {disabled && !isCore && (
              <Tooltip content="Feature is disabled due to dependencies">
                <AlertCircle className="h-4 w-4 text-muted-foreground" aria-label="Disabled" />
              </Tooltip>
            )}
          </div>
          {description && (
            <p
              id={descriptionId}
              className={cn(
                "text-xs text-muted-foreground mt-1",
                disabled && "text-muted-foreground/70"
              )}
            >
              {description}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            id={toggleId}
            checked={checked}
            onCheckedChange={onCheckedChange}
            disabled={disabled || isCore}
            ref={ref}
            aria-labelledby={ariaLabelledBy || labelId}
            aria-describedby={ariaDescribedBy || (description ? descriptionId : undefined)}
            aria-label={label}
            aria-required={isCore}
            tabIndex={disabled || isCore ? -1 : 0}
            onKeyDown={handleKeyDown}
            className={cn(
              isCore && "opacity-50 cursor-not-allowed",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            {...props}
          />
          {tooltip && (
            <Tooltip content={tooltip}>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="More information"
                tabIndex={0}
              >
                <AlertCircle className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    );

    return toggleElement;
  }
);

AccessibleToggle.displayName = 'AccessibleToggle';
