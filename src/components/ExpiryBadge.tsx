/**
 * Expiry Badge Component
 * Displays expiry status for products with lots
 */

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Clock, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';

export interface ExpiryInfo {
  days_to_expiry: number | null;
  expiry_status: 'No Expiry' | 'Fresh' | 'Near Expiry' | 'Critical' | 'Expired';
  expiry_date?: string;
}

interface ExpiryBadgeProps {
  expiryInfo: ExpiryInfo;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ExpiryBadge: React.FC<ExpiryBadgeProps> = ({
  expiryInfo,
  showIcon = true,
  size = 'md',
  className = ''
}) => {
  const { days_to_expiry, expiry_status, expiry_date } = expiryInfo;

  // Don't render if no expiry information
  if (!expiryInfo || expiry_status === 'No Expiry') {
    return null;
  }

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Expired':
        return 'destructive';
      case 'Critical':
        return 'destructive';
      case 'Near Expiry':
        return 'warning';
      case 'Fresh':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'Expired':
        return <XCircle className="h-3 w-3" />;
      case 'Critical':
        return <AlertTriangle className="h-3 w-3" />;
      case 'Near Expiry':
        return <Clock className="h-3 w-3" />;
      case 'Fresh':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getText = (status: string, days: number | null) => {
    switch (status) {
      case 'Expired':
        return days ? `Expired ${Math.abs(days)} days ago` : 'Expired';
      case 'Critical':
        return `Expires in ${days} days`;
      case 'Near Expiry':
        return `Expires in ${days} days`;
      case 'Fresh':
        return `Expires in ${days} days`;
      default:
        return 'Unknown status';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-2.5 py-1.5',
    lg: 'text-base px-3 py-2'
  };

  return (
    <Badge
      variant={getBadgeVariant(expiry_status)}
      className={`${sizeClasses[size]} ${className} flex items-center gap-1`}
      title={expiry_date ? `Expiry Date: ${new Date(expiry_date).toLocaleDateString()}` : undefined}
    >
      {showIcon && getIcon(expiry_status)}
      <span>{getText(expiry_status, days_to_expiry)}</span>
    </Badge>
  );
};

/**
 * Expiry Badge List Component
 * Displays multiple expiry badges for a product with multiple lots
 */
interface ExpiryBadgeListProps {
  lots: Array<{
    lot_id: number;
    lot_number: string;
    quantity_remaining: number;
    expiry_date?: string;
    days_to_expiry?: number | null;
    expiry_status?: string;
  }>;
  maxDisplay?: number;
  showQuantity?: boolean;
  className?: string;
}

export const ExpiryBadgeList: React.FC<ExpiryBadgeListProps> = ({
  lots,
  maxDisplay = 3,
  showQuantity = false,
  className = ''
}) => {
  // Filter lots with expiry information and sort by urgency
  const lotsWithExpiry = lots
    .filter(lot => lot.expiry_date && lot.quantity_remaining > 0)
    .sort((a, b) => {
      // Sort by expiry status priority, then by days to expiry
      const statusPriority = {
        'Expired': 0,
        'Critical': 1,
        'Near Expiry': 2,
        'Fresh': 3
      };
      
      const aPriority = statusPriority[a.expiry_status as keyof typeof statusPriority] ?? 4;
      const bPriority = statusPriority[b.expiry_status as keyof typeof statusPriority] ?? 4;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return (a.days_to_expiry ?? 999) - (b.days_to_expiry ?? 999);
    });

  if (lotsWithExpiry.length === 0) {
    return null;
  }

  const displayLots = lotsWithExpiry.slice(0, maxDisplay);
  const remainingCount = lotsWithExpiry.length - maxDisplay;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {displayLots.map((lot) => (
        <div key={lot.lot_id} className="flex items-center gap-1">
          <ExpiryBadge
            expiryInfo={{
              days_to_expiry: lot.days_to_expiry ?? null,
              expiry_status: lot.expiry_status as any,
              expiry_date: lot.expiry_date
            }}
            size="sm"
            showIcon={false}
          />
          {showQuantity && (
            <span className="text-xs text-muted-foreground">
              ({lot.quantity_remaining})
            </span>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs px-2 py-1">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
};

/**
 * Expiry Status Indicator
 * Simple indicator for product cards
 */
interface ExpiryStatusIndicatorProps {
  expiryInfo: ExpiryInfo;
  className?: string;
}

export const ExpiryStatusIndicator: React.FC<ExpiryStatusIndicatorProps> = ({
  expiryInfo,
  className = ''
}) => {
  const { expiry_status } = expiryInfo;

  if (!expiryInfo || expiry_status === 'No Expiry' || expiry_status === 'Fresh') {
    return null;
  }

  const getIndicatorColor = (status: string) => {
    switch (status) {
      case 'Expired':
        return 'bg-red-500';
      case 'Critical':
        return 'bg-orange-500';
      case 'Near Expiry':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div
      className={`w-2 h-2 rounded-full ${getIndicatorColor(expiry_status)} ${className}`}
      title={`${expiry_status}: ${expiryInfo.days_to_expiry ? `${expiryInfo.days_to_expiry} days` : 'Unknown'}`}
    />
  );
};
