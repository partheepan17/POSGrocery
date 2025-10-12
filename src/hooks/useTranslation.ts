// src/hooks/useTranslation.ts
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { 
  formatCurrency, 
  formatNumber, 
  formatDate, 
  formatTime, 
  formatDateTime, 
  formatRelativeTime,
  formatWeight,
  formatQuantity,
  formatPercentage,
  formatFileSize,
  pluralize,
  isRTL,
  getDirection
} from '@/i18n/formatters';

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation();

  return {
    t,
    i18n,
    // Formatters
    formatCurrency,
    formatNumber,
    formatDate,
    formatTime,
    formatDateTime,
    formatRelativeTime,
    formatWeight,
    formatQuantity,
    formatPercentage,
    formatFileSize,
    pluralize,
    isRTL,
    getDirection,
    // Language utilities
    changeLanguage: i18n.changeLanguage,
    language: i18n.language,
    languages: i18n.languages,
    isInitialized: i18n.isInitialized,
  };
};



