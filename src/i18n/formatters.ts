// src/i18n/formatters.ts
import i18n from 'i18next';

// Currency formatter
export const formatCurrency = (amount: number, currency: string = 'LKR'): string => {
  const locale = i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-LK';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Number formatter
export const formatNumber = (value: number, options?: Intl.NumberFormatOptions): string => {
  const locale = i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-LK';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value);
};

// Date formatter
export const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const locale = i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-LK';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  }).format(dateObj);
};

// Time formatter
export const formatTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const locale = i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-LK';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    ...options,
  }).format(dateObj);
};

// DateTime formatter
export const formatDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const locale = i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-LK';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  }).format(dateObj);
};

// Relative time formatter (e.g., "2 hours ago", "in 3 days")
export const formatRelativeTime = (date: Date | string): string => {
  const locale = i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-LK';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  
  if (Math.abs(diffInSeconds) < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (Math.abs(diffInSeconds) < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (Math.abs(diffInSeconds) < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (Math.abs(diffInSeconds) < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (Math.abs(diffInSeconds) < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
};

// Pluralization helper
export const pluralize = (count: number, singular: string, plural: string): string => {
  return count === 1 ? singular : plural;
};

// RTL support check
export const isRTL = (): boolean => {
  return i18n.language === 'ar' || i18n.language === 'he' || i18n.language === 'fa';
};

// Language direction
export const getDirection = (): 'ltr' | 'rtl' => {
  return isRTL() ? 'rtl' : 'ltr';
};

// Format weight with unit
export const formatWeight = (weight: number, unit: string = 'kg'): string => {
  return `${formatNumber(weight)} ${unit}`;
};

// Format quantity with unit
export const formatQuantity = (quantity: number, unit: string = 'piece'): string => {
  return `${formatNumber(quantity)} ${unit}`;
};

// Format percentage
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${formatNumber(value, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  })}%`;
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  const locale = i18n.language === 'si' ? 'si-LK' : i18n.language === 'ta' ? 'ta-LK' : 'en-LK';
  
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
  }).format(bytes / Math.pow(k, i)) + ' ' + sizes[i];
};



