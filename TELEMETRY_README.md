# Feature Usage Telemetry System

A comprehensive telemetry system for tracking feature usage, generating analytics, and providing data-driven recommendations for feature management.

## 🎯 Overview

The telemetry system tracks how features are actually being used in the application, providing insights that help with:
- **Feature Adoption**: Understanding which features are popular
- **Usage Patterns**: Identifying peak usage times and user behavior
- **Feature Health**: Detecting unused or underutilized features
- **Data-Driven Decisions**: Making informed choices about feature defaults and deprecation

## 🏗️ Architecture

### Backend Components

1. **Database Schema** (`060_feature_telemetry.sql`)
   - `feature_usage_events`: Detailed event tracking
   - `feature_usage_counters`: Aggregated daily counters
   - `feature_usage_recommendations`: AI-generated suggestions

2. **API Endpoints** (`server/routes/telemetry.ts`)
   - `POST /api/telemetry/feature-usage`: Track usage events
   - `GET /api/telemetry/usage-analytics`: Get usage statistics
   - `GET /api/telemetry/feature-recommendations`: Get AI recommendations

3. **Real-time Processing**
   - Automatic counter updates via database triggers
   - Efficient aggregation and caching
   - Background recommendation generation

### Frontend Components

1. **Telemetry Service** (`src/services/telemetryService.ts`)
   - Event queuing and batching
   - Automatic retry logic
   - Performance optimization

2. **React Hooks** (`src/hooks/useTelemetry.ts`)
   - `useTelemetry`: General telemetry tracking
   - `useFeatureTracking`: Feature-specific tracking
   - `usePageTracking`: Route-based tracking

3. **Analytics Dashboard** (`src/components/analytics/`)
   - Usage statistics visualization
   - Sparkline charts for trends
   - Feature recommendations display

## 🚀 Quick Start

### 1. Database Setup

```bash
# Run the telemetry migration
npm run db:migrate
```

### 2. Basic Usage

```tsx
import { useTelemetry } from '@/hooks/useTelemetry';

function MyComponent() {
  const { trackClick, trackInteraction } = useTelemetry({
    featureCode: 'my.feature',
    component: 'MyComponent'
  });

  const handleButtonClick = () => {
    trackClick('button_clicked');
    // Your component logic
  };

  return <button onClick={handleButtonClick}>Click me</button>;
}
```

### 3. Feature Tracking

```tsx
import { useFeatureTracking } from '@/hooks/useTelemetry';

function SalesPage() {
  const { trackApiCall, trackToggle } = useFeatureTracking('sales.view', 'SalesPage');

  const handleCheckout = async () => {
    const startTime = Date.now();
    try {
      await processCheckout();
      const duration = Date.now() - startTime;
      trackApiCall('/api/sales/checkout', 'sales.checkout', duration, true);
    } catch (error) {
      trackApiCall('/api/sales/checkout', 'sales.checkout', Date.now() - startTime, false);
    }
  };

  return <button onClick={handleCheckout}>Checkout</button>;
}
```

## 📊 Event Types

### Supported Event Types

1. **`route_visit`**: Page/route navigation
2. **`action_click`**: Button clicks and user actions
3. **`feature_toggle`**: Feature enable/disable actions
4. **`api_call`**: API endpoint calls
5. **`ui_interaction`**: General UI interactions

### Event Structure

```typescript
interface TelemetryEvent {
  featureCode: string;
  eventType: 'route_visit' | 'action_click' | 'feature_toggle' | 'api_call' | 'ui_interaction';
  eventData?: Record<string, any>;
  metadata?: {
    route?: string;
    component?: string;
    action?: string;
    duration?: number;
    success?: boolean;
  };
}
```

## 📈 Analytics Dashboard

### Usage Statistics

The dashboard provides comprehensive usage analytics:

- **Total Usage**: Overall feature usage counts
- **Active Features**: Number of features being used
- **Average Usage**: Usage per feature
- **Recommendations**: AI-generated suggestions

### Visualizations

1. **Sparkline Charts**: Show usage trends over time
2. **Trend Indicators**: Increasing/decreasing/stable usage
3. **Usage Heatmaps**: Feature popularity visualization
4. **Recommendation Cards**: Actionable insights

### Filtering Options

- **Time Period**: 7 days, 30 days, 90 days
- **Feature**: Specific feature or all features
- **Grouping**: Daily, weekly, monthly aggregation

## 🤖 AI Recommendations

### Recommendation Types

1. **`enable_default`**: Enable feature by default (high usage)
2. **`disable_default`**: Disable feature by default (low usage)
3. **`deprecate`**: Mark feature for deprecation (unused)
4. **`promote`**: Promote feature to users (underutilized)

### Confidence Scoring

- **0.0 - 0.3**: Low confidence
- **0.3 - 0.7**: Medium confidence
- **0.7 - 1.0**: High confidence

### Recommendation Factors

- Total usage count
- Active days
- User engagement
- Feature dependencies
- Usage trends

## 🔧 Configuration

### Environment Variables

```env
# Telemetry settings
TELEMETRY_ENABLED=true
TELEMETRY_BATCH_SIZE=100
TELEMETRY_FLUSH_INTERVAL=30000
TELEMETRY_RETENTION_DAYS=90
```

### Feature Configuration

```typescript
// Enable/disable telemetry per feature
telemetryService.setEnabled(true);

// Configure tracking options
const { trackClick } = useTelemetry({
  featureCode: 'my.feature',
  component: 'MyComponent',
  trackRouteVisits: true,
  trackClicks: true,
  trackInteractions: true
});
```

## 📱 Integration Examples

### 1. Page-Level Tracking

```tsx
function DashboardPage() {
  usePageTracking('dashboard.view');
  
  return <div>Dashboard content</div>;
}
```

### 2. Component Tracking

```tsx
function ProductCard({ product }) {
  const { trackClick } = useFeatureTracking('inventory.products', 'ProductCard');
  
  const handleEdit = () => {
    trackClick('edit_product');
    // Edit logic
  };
  
  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={handleEdit}>Edit</button>
    </div>
  );
}
```

### 3. API Call Tracking

```tsx
function useApiCall() {
  const { trackApiCall } = useTelemetry({
    featureCode: 'api.calls',
    component: 'ApiService'
  });
  
  const callApi = async (endpoint: string, featureCode: string) => {
    const startTime = Date.now();
    try {
      const response = await fetch(endpoint);
      const duration = Date.now() - startTime;
      trackApiCall(endpoint, featureCode, duration, true);
      return response;
    } catch (error) {
      trackApiCall(endpoint, featureCode, Date.now() - startTime, false);
      throw error;
    }
  };
  
  return { callApi };
}
```

### 4. Performance Tracking

```tsx
function ReportGenerator() {
  const { trackPerformance } = useFeatureTracking('reports.sales', 'ReportGenerator');
  
  const generateReport = async () => {
    const startTime = Date.now();
    try {
      await processReport();
      const duration = Date.now() - startTime;
      trackPerformance('report_generation', duration, 'ms');
    } catch (error) {
      trackPerformance('report_generation_failed', Date.now() - startTime, 'ms');
    }
  };
  
  return <button onClick={generateReport}>Generate Report</button>;
}
```

## 🧪 Testing

### Test Script

```bash
# Run telemetry tests
node test-telemetry.js
```

### Test Coverage

- Feature usage tracking
- Analytics data retrieval
- Recommendation generation
- Bulk event processing
- Error handling

### Mock Data

The system includes comprehensive mock data for testing:
- Sample usage events
- Feature configurations
- User interactions
- Performance metrics

## 📊 Performance Considerations

### Optimization Strategies

1. **Event Batching**: Queue events and send in batches
2. **Caching**: Cache analytics data for faster retrieval
3. **Background Processing**: Generate recommendations asynchronously
4. **Data Retention**: Automatic cleanup of old data

### Monitoring

- Event queue size
- Processing latency
- Error rates
- Storage usage

## 🔒 Privacy & Security

### Data Collection

- Only feature usage data is collected
- No personal information is tracked
- User actions are anonymized
- IP addresses are hashed

### Compliance

- GDPR compliant data handling
- Configurable data retention
- User consent mechanisms
- Data export capabilities

## 🚀 Deployment

### Production Setup

1. **Database Migration**
   ```bash
   npm run db:migrate
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Configure telemetry settings
   ```

3. **Start Services**
   ```bash
   npm run dev
   ```

### Monitoring

- Set up alerts for high error rates
- Monitor database growth
- Track API performance
- Review recommendation accuracy

## 📚 API Reference

### Telemetry Service

```typescript
class TelemetryService {
  trackFeatureUsage(event: TelemetryEvent): void;
  trackRouteVisit(route: string, featureCode?: string): void;
  trackActionClick(action: string, featureCode: string, component?: string): void;
  trackFeatureToggle(featureCode: string, enabled: boolean, success?: boolean): void;
  trackApiCall(endpoint: string, featureCode: string, duration?: number, success?: boolean): void;
  trackUiInteraction(interaction: string, featureCode: string, component?: string, duration?: number): void;
  getUsageAnalytics(params?: AnalyticsParams): Promise<UsageAnalytics>;
  getFeatureRecommendations(): Promise<FeatureRecommendation[]>;
  setEnabled(enabled: boolean): void;
  flushEvents(): Promise<void>;
}
```

### React Hooks

```typescript
function useTelemetry(options: UseTelemetryOptions): TelemetryMethods;
function useFeatureTracking(featureCode: string, component?: string): TelemetryMethods;
function usePageTracking(featureCode?: string): TelemetryMethods;
```

## 🤝 Contributing

### Adding New Event Types

1. Update the `TelemetryEvent` interface
2. Add validation in the API endpoint
3. Update the frontend service
4. Add tests for the new event type

### Extending Analytics

1. Add new aggregation functions
2. Update the dashboard components
3. Add new visualization types
4. Update the API endpoints

## 📄 License

This telemetry system is part of the POS Grocery V2 project and follows the same MIT license.

---

**Built with ❤️ by the POS Grocery Team**










