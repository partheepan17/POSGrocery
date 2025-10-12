// src/components/LanguageTest.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageTest: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
      <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
        Language Test Component
      </h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Navigation:</strong>
          <ul className="ml-4 space-y-1">
            <li>Sales: {t('navigation.sales')}</li>
            <li>Products: {t('navigation.products')}</li>
            <li>Inventory: {t('navigation.inventory')}</li>
            <li>Settings: {t('navigation.settings')}</li>
          </ul>
        </div>
        
        <div>
          <strong>Common Actions:</strong>
          <ul className="ml-4 space-y-1">
            <li>Save: {t('common.save')}</li>
            <li>Cancel: {t('common.cancel')}</li>
            <li>Delete: {t('common.delete')}</li>
            <li>Search: {t('common.search')}</li>
          </ul>
        </div>
        
        <div>
          <strong>Sales:</strong>
          <ul className="ml-4 space-y-1">
            <li>New Sale: {t('sales.newSale')}</li>
            <li>Cart: {t('sales.cart')}</li>
            <li>Checkout: {t('sales.checkout')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};


