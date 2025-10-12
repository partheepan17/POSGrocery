/**
 * Utility functions re-exported from the utils directory
 * This file provides a centralized import point for common utilities
 */

// Currency utilities
export {
  formatCurrency,
  parseCurrency,
  calculateDiscount,
  calculateTax,
  calculateTotal,
  roundToNearest,
  roundUp,
  roundDown,
  CURRENCY_FORMATTERS,
  LKR_SYMBOL,
  LKR_CODE
} from '@/utils/currency';

// Class name utilities
export { cn } from '@/utils/cn';

// API utilities
export { getApiBaseUrl } from '@/utils/api';

// Scanner utilities
export { ScannerBuffer, parseWeightedBarcode } from '@/utils/scannerBuffer';

// Receipt utilities
export { generateReceiptNumber } from '@/utils/receiptNumber';

// Performance utilities
export { 
  useDebounce,
  useThrottle,
  useMemoizedComponent,
  performanceMonitor,
  measurePerformance,
  usePerformanceMeasurement,
  calculateVirtualScrollParams,
  useLazyImage,
  lazyImport,
  useMemoryCleanup,
  preloadCriticalResources,
  PERFORMANCE_BUDGETS,
  checkPerformanceBudget
} from '@/utils/performance';

// Keyboard utilities
export { 
  DEFAULT_SHORTCUTS,
  KeyboardHandler,
  keyboardHandler
} from '@/utils/keyboard';

// Offline utilities
export { 
  offlineQueue,
  fetchWithOffline
} from '@/utils/offlineQueue';

// Ping utilities
export { pingApi, pingDevices, type HealthResult } from '@/utils/ping';

// Telemetry utilities
export { 
  telemetry,
  measurePerformance as measureTelemetryPerformance,
  logError,
  trackPageView,
  trackComponentUsage,
  type TelemetryEvent,
  type TelemetryConfig
} from '@/utils/telemetry';
