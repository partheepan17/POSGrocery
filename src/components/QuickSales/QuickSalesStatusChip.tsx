import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useQuickSales } from '@/contexts/QuickSalesContext';
import { formatCurrency } from '@/utils/currency';

export const QuickSalesStatusChip: React.FC = () => {
  const { t } = useTranslation();
  const { session, isLoading, isYesterdaySession } = useQuickSales();

  if (isLoading) {
    return (
      <Badge variant="outline" size="sm" className="animate-pulse">
        <Clock className="w-3 h-3 mr-1" />
        {t('quickSales.statusChip.loading')}
      </Badge>
    );
  }

  if (!session) {
    return (
      <Badge variant="outline" size="sm">
        <ShoppingCart className="w-3 h-3 mr-1" />
        {t('quickSales.statusChip.noSession')}
      </Badge>
    );
  }

  if (isYesterdaySession) {
    return (
      <Badge variant="warning" size="sm">
        <Clock className="w-3 h-3 mr-1" />
        {t('quickSales.statusChip.yesterdayOpen', { date: new Date(session.session_date).toLocaleDateString() })}
      </Badge>
    );
  }

  if (session.status === 'open') {
    return (
      <Badge variant="success" size="sm">
        <CheckCircle className="w-3 h-3 mr-1" />
        {t('quickSales.statusChip.openToday', { 
          items: session.total_lines,
          amount: formatCurrency(session.total_amount, { showSymbol: true })
        })}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" size="sm">
      <ShoppingCart className="w-3 h-3 mr-1" />
      {t('quickSales.statusChip.closed')}
    </Badge>
  );
};
