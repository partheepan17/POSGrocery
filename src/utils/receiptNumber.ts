/**
 * Receipt Number Generator
 * Generates unique receipt numbers in DDMMYYYYHHMMSS format
 */

import { SETTINGS } from '@/config/settings';
import { dataService } from '@/services/dataService';

export function generateReceiptNumber(baseDate = new Date()): string {
  // Format DDMMYYYYHHMMSS in Asia/Colombo (or SETTINGS.TIMEZONE)
  const tz = SETTINGS.TIMEZONE;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(baseDate).reduce((acc, p) => (acc[p.type] = p.value, acc), {} as any);

  const DD = parts.day;
  const MM = parts.month;
  const YYYY = parts.year;
  const HH = parts.hour;
  const MIN = parts.minute;
  const SS = parts.second;

  const base = `${DD}${MM}${YYYY}${HH}${MIN}${SS}`;

  // Uniqueness check in local "DB"
  let receipt = base;
  let seq = 0;
  while (dataService.existsReceiptNo && dataService.existsReceiptNo(receipt)) {
    seq += 1;
    receipt = `${base}-${seq}`;
  }
  return receipt;
}

export function parseReceiptNumber(receiptNumber: string): Date | null {
  if (receiptNumber.length !== 14) {
    return null;
  }
  
  try {
    const day = parseInt(receiptNumber.substring(0, 2));
    const month = parseInt(receiptNumber.substring(2, 4)) - 1; // Month is 0-indexed
    const year = parseInt(receiptNumber.substring(4, 8));
    const hours = parseInt(receiptNumber.substring(8, 10));
    const minutes = parseInt(receiptNumber.substring(10, 12));
    const seconds = parseInt(receiptNumber.substring(12, 14));
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    return null;
  }
}

export function formatReceiptNumber(receiptNumber: string): string {
  if (receiptNumber.length !== 14) {
    return receiptNumber;
  }
  
  const day = receiptNumber.substring(0, 2);
  const month = receiptNumber.substring(2, 4);
  const year = receiptNumber.substring(4, 8);
  const hours = receiptNumber.substring(8, 10);
  const minutes = receiptNumber.substring(10, 12);
  const seconds = receiptNumber.substring(12, 14);
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
