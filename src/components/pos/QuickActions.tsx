/**
 * Quick Actions Component
 * Provides quick access to common POS operations
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Receipt, 
  Clock, 
  RefreshCw, 
  Settings, 
  Users, 
  Package,
  DollarSign,
  BarChart3,
  FileText,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useUIStore } from '@/store/uiStore';

interface QuickActionsProps {
  onReprint?: () => void;
  onHeldSales?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  onCustomers?: () => void;
  onProducts?: () => void;
  onPricing?: () => void;
  onReports?: () => void;
  onInvoices?: () => void;
  onPrintTest?: () => void;
  className?: string;
}

export function QuickActions({
  onReprint,
  onHeldSales,
  onRefresh,
  onSettings,
  onCustomers,
  onProducts,
  onPricing,
  onReports,
  onInvoices,
  onPrintTest,
  className
}: QuickActionsProps) {
  const { t } = useTranslation();
  const { userRole } = useUIStore();

  const isAdmin = userRole === 'manager';

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">{t('pos.quickActions')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Sales Actions */}
          {onReprint && (
            <Button
              variant="outline"
              onClick={onReprint}
              leftIcon={<Receipt className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.reprint')}
            </Button>
          )}
          
          {onHeldSales && (
            <Button
              variant="outline"
              onClick={onHeldSales}
              leftIcon={<Clock className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.heldSales')}
            </Button>
          )}
          
          {onRefresh && (
            <Button
              variant="outline"
              onClick={onRefresh}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.refresh')}
            </Button>
          )}

          {/* Management Actions */}
          {isAdmin && onCustomers && (
            <Button
              variant="outline"
              onClick={onCustomers}
              leftIcon={<Users className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.customers')}
            </Button>
          )}
          
          {isAdmin && onProducts && (
            <Button
              variant="outline"
              onClick={onProducts}
              leftIcon={<Package className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.products')}
            </Button>
          )}
          
          {isAdmin && onPricing && (
            <Button
              variant="outline"
              onClick={onPricing}
              leftIcon={<DollarSign className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.pricing')}
            </Button>
          )}
          
          {isAdmin && onReports && (
            <Button
              variant="outline"
              onClick={onReports}
              leftIcon={<BarChart3 className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.reports')}
            </Button>
          )}
          
          {isAdmin && onInvoices && (
            <Button
              variant="outline"
              onClick={onInvoices}
              leftIcon={<FileText className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.invoices')}
            </Button>
          )}
          
          {isAdmin && onSettings && (
            <Button
              variant="outline"
              onClick={onSettings}
              leftIcon={<Settings className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.settings')}
            </Button>
          )}
          
          {onPrintTest && (
            <Button
              variant="outline"
              onClick={onPrintTest}
              leftIcon={<Printer className="w-4 h-4" />}
              className="h-12 justify-start"
            >
              {t('pos.testPrint')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}