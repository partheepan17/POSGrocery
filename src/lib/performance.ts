import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number | null; // Largest Contentful Paint
  inp: number | null; // Interaction to Next Paint (replaces FID)
  cls: number | null; // Cumulative Layout Shift
  
  // Additional metrics
  fcp: number | null; // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  
  // Custom POS metrics
  searchTime: number | null; // Search operation time
  checkoutOpenTime: number | null; // Checkout modal open time
  refundConfirmTime: number | null; // Refund confirmation time
  pageLoadTime: number | null; // Page load time
  apiResponseTime: number | null; // API response time
}

export interface PerformanceBudget {
  lcp: number; // 2.0s for dev, 2.5s for prod
  ttfb: number; // 0.6s
  inp: number; // 200ms (INP threshold is higher than FID)
  cls: number; // 0.1
  fcp: number; // 1.8s
  searchTime: number; // 200ms
  checkoutOpenTime: number; // 500ms
  refundConfirmTime: number; // 300ms
  pageLoadTime: number; // 3.0s
  apiResponseTime: number; // 1.0s
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    lcp: null,
    inp: null,
    cls: null,
    fcp: null,
    ttfb: null,
    searchTime: null,
    checkoutOpenTime: null,
    refundConfirmTime: null,
    pageLoadTime: null,
    apiResponseTime: null
  };

  private budget: PerformanceBudget;
  private isDev: boolean;
  private apiEndpoint: string;

  constructor(isDev: boolean = false, apiEndpoint: string = '/api/metrics') {
    this.isDev = isDev;
    this.apiEndpoint = apiEndpoint;
    this.budget = {
      lcp: isDev ? 2000 : 2500,
      ttfb: 600,
      inp: 200,
      cls: 0.1,
      fcp: 1800,
      searchTime: 200,
      checkoutOpenTime: 500,
      refundConfirmTime: 300,
      pageLoadTime: 3000,
      apiResponseTime: 1000
    };
  }

  async initialize() {
    // Measure Core Web Vitals
    this.measureWebVitals();
    
    // Measure page load time
    this.measurePageLoadTime();
    
    // Set up performance marks for custom metrics
    this.setupPerformanceMarks();
  }

  private measureWebVitals() {
    // Largest Contentful Paint
    onLCP((metric) => {
      this.metrics.lcp = metric.value;
      this.logMetric('LCP', metric.value, this.budget.lcp);
    });

    // First Input Delay
    onINP((metric) => {
      this.metrics.inp = metric.value;
      this.logMetric('INP', metric.value, this.budget.inp);
    });

    // Cumulative Layout Shift
    onCLS((metric) => {
      this.metrics.cls = metric.value;
      this.logMetric('CLS', metric.value, this.budget.cls);
    });

    // First Contentful Paint
    onFCP((metric) => {
      this.metrics.fcp = metric.value;
      this.logMetric('FCP', metric.value, this.budget.fcp);
    });

    // Time to First Byte
    onTTFB((metric) => {
      this.metrics.ttfb = metric.value;
      this.logMetric('TTFB', metric.value, this.budget.ttfb);
    });
  }

  private measurePageLoadTime() {
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          this.logMetric('Page Load', this.metrics.pageLoadTime, this.budget.pageLoadTime);
        }
      });
    }
  }

  private setupPerformanceMarks() {
    // Override fetch to measure API response times
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = performance.now();
        const response = await originalFetch(...args);
        const end = performance.now();
        
        this.metrics.apiResponseTime = end - start;
        this.logMetric('API Response', this.metrics.apiResponseTime, this.budget.apiResponseTime);
        
        return response;
      };
    }
  }

  // Custom performance marks for POS operations
  markSearchStart() {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark('search-start');
    }
  }

  markSearchEnd() {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark('search-end');
      const measure = performance.measure('search-duration', 'search-start', 'search-end');
      this.metrics.searchTime = measure.duration;
      this.logMetric('Search', this.metrics.searchTime, this.budget.searchTime);
    }
  }

  markCheckoutOpenStart() {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark('checkout-open-start');
    }
  }

  markCheckoutOpenEnd() {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark('checkout-open-end');
      const measure = performance.measure('checkout-open-duration', 'checkout-open-start', 'checkout-open-end');
      this.metrics.checkoutOpenTime = measure.duration;
      this.logMetric('Checkout Open', this.metrics.checkoutOpenTime, this.budget.checkoutOpenTime);
    }
  }

  markRefundConfirmStart() {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark('refund-confirm-start');
    }
  }

  markRefundConfirmEnd() {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark('refund-confirm-end');
      const measure = performance.measure('refund-confirm-duration', 'refund-confirm-start', 'refund-confirm-end');
      this.metrics.refundConfirmTime = measure.duration;
      this.logMetric('Refund Confirm', this.metrics.refundConfirmTime, this.budget.refundConfirmTime);
    }
  }

  private logMetric(name: string, value: number, budget: number) {
    const isOverBudget = value > budget;
    const status = isOverBudget ? '❌' : '✅';
    
    if (this.isDev) {
      console.log(`${status} ${name}: ${value.toFixed(2)}ms (budget: ${budget}ms)`);
    }

    // Send to metrics endpoint in production
    if (!this.isDev) {
      this.sendMetricToAPI(name, value, budget, isOverBudget);
    }
  }

  private async sendMetricToAPI(name: string, value: number, budget: number, isOverBudget: boolean) {
    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metric: name,
          value,
          budget,
          isOverBudget,
          timestamp: Date.now(),
          url: window.location.href,
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.warn('Failed to send performance metric:', error);
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getBudget(): PerformanceBudget {
    return { ...this.budget };
  }

  isOverBudget(): boolean {
    const metrics = this.getMetrics();
    const budget = this.getBudget();

    return (
      (metrics.lcp !== null && metrics.lcp > budget.lcp) ||
      (metrics.inp !== null && metrics.inp > budget.inp) ||
      (metrics.cls !== null && metrics.cls > budget.cls) ||
      (metrics.fcp !== null && metrics.fcp > budget.fcp) ||
      (metrics.ttfb !== null && metrics.ttfb > budget.ttfb) ||
      (metrics.searchTime !== null && metrics.searchTime > budget.searchTime) ||
      (metrics.checkoutOpenTime !== null && metrics.checkoutOpenTime > budget.checkoutOpenTime) ||
      (metrics.refundConfirmTime !== null && metrics.refundConfirmTime > budget.refundConfirmTime) ||
      (metrics.pageLoadTime !== null && metrics.pageLoadTime > budget.pageLoadTime) ||
      (metrics.apiResponseTime !== null && metrics.apiResponseTime > budget.apiResponseTime)
    );
  }

  getPerformanceReport(): string {
    const metrics = this.getMetrics();
    const budget = this.getBudget();
    
    let report = 'Performance Report:\n';
    report += '==================\n\n';
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (value !== null) {
        const budgetValue = budget[key as keyof PerformanceBudget];
        const status = value > budgetValue ? '❌ OVER BUDGET' : '✅ OK';
        report += `${key.toUpperCase()}: ${value.toFixed(2)}ms (budget: ${budgetValue}ms) ${status}\n`;
      }
    });
    
    return report;
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor(
  import.meta.env.DEV,
  import.meta.env.VITE_API_BASE_URL + '/api/metrics'
);
