// Frontend performance utilities
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';

// Debounce hook for search inputs
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for high-frequency events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  
  return useCallback((...args: any[]) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]) as T;
}

// Memoized component for expensive operations
export function useMemoizedComponent<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  props: T,
  deps: React.DependencyList
) {
  return useMemo(() => {
    return React.createElement(Component, props);
  }, deps);
}

// Performance monitoring
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  record(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(duration);
    
    // Keep only last 100 measurements
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }
  }

  getP95(operation: string): number {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) return 0;
    
    const sorted = [...metrics].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[index];
  }

  getStats(operation: string): { p50: number; p95: number; p99: number; count: number } {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return { p50: 0, p95: 0, p99: 0, count: 0 };
    }
    
    const sorted = [...metrics].sort((a, b) => a - b);
    const p50Index = Math.ceil(sorted.length * 0.5) - 1;
    const p95Index = Math.ceil(sorted.length * 0.95) - 1;
    const p99Index = Math.ceil(sorted.length * 0.99) - 1;
    
    return {
      p50: sorted[p50Index],
      p95: sorted[p95Index],
      p99: sorted[p99Index],
      count: sorted.length
    };
  }

  clear(): void {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Performance measurement decorator
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      const start = performance.now();
      const result = method.apply(this, args);
      
      if (result instanceof Promise) {
        return result.then((value) => {
          const duration = performance.now() - start;
          performanceMonitor.record(operation, duration);
          return value;
        });
      } else {
        const duration = performance.now() - start;
        performanceMonitor.record(operation, duration);
        return result;
      }
    };
  };
}

// React hook for performance measurement
export function usePerformanceMeasurement(operation: string) {
  const startTime = useRef<number>();
  
  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);
  
  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      performanceMonitor.record(operation, duration);
      startTime.current = undefined;
    }
  }, []);
  
  return { start, end };
}

// Virtual scrolling utilities
export function calculateVirtualScrollParams(
  itemHeight: number,
  containerHeight: number,
  totalItems: number,
  scrollTop: number
) {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, totalItems);
  
  return {
    startIndex,
    endIndex,
    visibleCount,
    totalHeight: totalItems * itemHeight,
    offsetY: startIndex * itemHeight
  };
}

// Image lazy loading
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setError(true);
      setIsLoading(false);
    };
    
    img.src = src;
  }, [src]);
  
  return { imageSrc, isLoading, error };
}

// Bundle size optimization - dynamic imports
export const lazyImport = {
  // POS components
  POS: () => import('../pages/pos/EnhancedPOS'),
  Cart: () => import('../components/pos/EnhancedCart'),
  CheckoutModal: () => import('../components/pos/EnhancedCheckoutModal'),
  
  // Reports
  Reports: () => import('../pages/Reports'),
  ZReport: () => import('../pages/Reports'),
  
  // Settings
  Settings: () => import('../pages/Settings'),
  Users: () => import('../pages/Users'),
  
  // Inventory
  Inventory: () => import('../pages/Inventory'),
  Products: () => import('../pages/Products'),
  
  // Customers
  Customers: () => import('../pages/Customers'),
  Suppliers: () => import('../pages/Suppliers')
};

// Memory management
export function useMemoryCleanup() {
  useEffect(() => {
    return () => {
      // Cleanup function for component unmount
      if (typeof window !== 'undefined' && 'gc' in window) {
        // Force garbage collection if available (dev only)
        (window as any).gc();
      }
    };
  }, []);
}

// Critical resource preloading
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;
  
  // Preload critical fonts
  const fontPreload = document.createElement('link');
  fontPreload.rel = 'preload';
  fontPreload.href = '/fonts/inter-var.woff2';
  fontPreload.as = 'font';
  fontPreload.type = 'font/woff2';
  fontPreload.crossOrigin = 'anonymous';
  document.head.appendChild(fontPreload);
  
  // Preload critical images
  const imagePreload = document.createElement('link');
  imagePreload.rel = 'preload';
  imagePreload.href = '/images/logo.svg';
  imagePreload.as = 'image';
  document.head.appendChild(imagePreload);
}

// Performance budget monitoring
export const PERFORMANCE_BUDGETS = {
  // React rendering
  COMPONENT_RENDER: 16, // 16ms for 60fps
  SEARCH_DEBOUNCE: 150, // 150ms debounce
  API_TIMEOUT: 5000, // 5s timeout
  
  // Bundle size limits
  INITIAL_BUNDLE: 500, // 500KB initial bundle
  CHUNK_SIZE: 200, // 200KB per chunk
  
  // Memory limits
  MAX_MEMORY_MB: 100, // 100MB memory usage
  CACHE_SIZE: 50 // 50 items in cache
};

export function checkPerformanceBudget(operation: string, value: number): boolean {
  const budget = PERFORMANCE_BUDGETS[operation as keyof typeof PERFORMANCE_BUDGETS];
  return budget ? value <= budget : true;
}
