import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { useQuickSales } from '@/contexts/QuickSalesContext';

interface YesterdaySessionBannerProps {
  onClose: () => void;
}

export const YesterdaySessionBanner: React.FC<YesterdaySessionBannerProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { session, closeSession, isLoading } = useQuickSales();
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [managerPin, setManagerPin] = useState('');
  const [closing, setClosing] = useState(false);

  const handleCloseSession = async () => {
    if (!managerPin.trim()) {
      toast.error(t('quickSales.errors.managerPinRequired'));
      return;
    }

    setClosing(true);
    const success = await closeSession(managerPin, 'Yesterday\'s session closed');
    
    if (success) {
      setShowCloseModal(false);
      setManagerPin('');
      onClose();
    }
    
    setClosing(false);
  };

  if (!session) return null;

  return (
    <>
      {/* Banner */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                {t('quickSales.yesterdayBanner.title')}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {t('quickSales.yesterdayBanner.description', { 
                  date: session.session_date,
                  items: session.total_lines,
                  amount: new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  }).format(session.total_amount)
                })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowCloseModal(true)}
              variant="warning"
              size="sm"
              disabled={isLoading}
            >
              <Clock className="w-4 h-4 mr-2" />
              {t('quickSales.yesterdayBanner.closeNow')}
            </Button>
            
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Close Confirmation Modal */}
      <Dialog isOpen={showCloseModal} onClose={() => setShowCloseModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('quickSales.yesterdayBanner.closeModalTitle')}</DialogTitle>
            <DialogDescription>
              {t('quickSales.yesterdayBanner.closeModalDescription', { 
                date: session.session_date,
                items: session.total_lines 
              })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('quickSales.closeConfirmation.managerPin')}
              </label>
              <Input
                type="password"
                value={managerPin}
                onChange={(e) => setManagerPin(e.target.value)}
                placeholder={t('quickSales.closeConfirmation.pinPlaceholder')}
                className="w-full"
              />
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('quickSales.yesterdayBanner.sessionSummary')}:
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{t('quickSales.sessionDate')}:</span>
                  <span className="font-medium">{session.session_date}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('quickSales.items')}:</span>
                  <span className="font-medium">{session.total_lines}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('quickSales.totalAmount')}:</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD'
                    }).format(session.total_amount)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                onClick={() => setShowCloseModal(false)}
                variant="ghost"
                disabled={closing}
              >
                {t('quickSales.closeConfirmation.cancel')}
              </Button>
              <Button
                onClick={handleCloseSession}
                variant="danger"
                disabled={closing || !managerPin.trim()}
                loading={closing}
              >
                {t('quickSales.yesterdayBanner.closeSession')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
