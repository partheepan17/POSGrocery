import { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from '@/components/Layout/Layout';
import { performanceMonitor } from '@/lib/performance';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { OfflineBanner } from '@/components/OfflineBanner';
import { DayEndSummaryModal } from '@/components/pos/DayEndSummaryModal';
import { shiftService } from '@/services/shiftService';
import { useAppStore } from '@/store/appStore';
import { LazyRoute, FeatureLazyRoute, PermissionLazyRoute, RoleLazyRoute } from '@/components/routing/LazyRoute';
import { AccessibilityProvider, SkipLink } from '@/components/ui/AccessibilityProvider';

// Lazy load all feature pages
const SalesPage = lazy(() => import('@/pages/pos/index'));
const QuickSalesPage = lazy(() => import('@/pages/QuickSales'));
const Products = lazy(() => import('@/pages/Products'));
const Customers = lazy(() => import('@/pages/Customers'));
const Suppliers = lazy(() => import('@/pages/Suppliers'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Discounts = lazy(() => import('@/pages/Discounts'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const InventoryAdjustment = lazy(() => import('@/pages/InventoryAdjustment'));
const Labels = lazy(() => import('@/pages/Labels'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));
const ReceiptTest = lazy(() => import('@/pages/ReceiptTest'));
const HealthCheck = lazy(() => import('@/pages/HealthCheck'));
const Login = lazy(() => import('@/pages/Login'));
const Returns = lazy(() => import('@/pages/Returns'));
const SalesReturn = lazy(() => import('@/pages/SalesReturn'));
const Stocktake = lazy(() => import('@/pages/Stocktake'));
const StocktakeSession = lazy(() => import('@/pages/StocktakeSession'));
const Grn = lazy(() => import('@/pages/purchasing/GRN'));
const GRN = lazy(() => import('@/pages/purchasing/GRN'));
const GRNList = lazy(() => import('@/pages/GrnList'));
const GRNReceive = lazy(() => import('@/pages/GRNReceive'));
const ShiftList = lazy(() => import('@/pages/ShiftList'));
const ShiftSession = lazy(() => import('@/pages/ShiftSession'));
const NewShift = lazy(() => import('@/pages/NewShift'));
const Audit = lazy(() => import('@/pages/Audit'));
const Users = lazy(() => import('@/pages/Users'));
const TestNavigation = lazy(() => import('@/pages/TestNavigation'));
const SimpleTest = lazy(() => import('@/pages/SimpleTest'));
const PrintTest = lazy(() => import('@/pages/PrintTest'));
const About = lazy(() => import('@/pages/About'));
const Search = lazy(() => import('@/pages/Search'));
const LanguageTest = lazy(() => import('@/components/LanguageTest'));
const HelpSupport = lazy(() => import('@/pages/HelpSupport'));
const StockDashboard = lazy(() => import('@/pages/StockDashboard'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const POCreate = lazy(() => import('@/pages/purchasing/POCreate'));
const GRNReceive2 = lazy(() => import('@/pages/purchasing/GRNReceive'));
const SupplierReturn = lazy(() => import('@/pages/purchasing/SupplierReturn'));
const DrawerOps = lazy(() => import('@/components/cash/DrawerOps'));

// Loading component
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
  </div>
);

// Not available page
const NotAvailable = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Feature Not Available</h1>
      <p className="text-gray-600 mb-4">This feature is not enabled for your account.</p>
      <Navigate to="/dashboard" replace />
    </div>
  </div>
);

function App() {
  const { theme, setTheme } = useAppStore();
  const [showDayEndModal, setShowDayEndModal] = useState(false);
  const [activeShiftId, setActiveShiftId] = useState<number | null>(null);
  const [terminal, setTerminal] = useState<string>('POS-001');

  useEffect(() => {
    // Apply initial theme
    setTheme(theme);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleThemeChange = () => {
      if (theme === 'auto') {
        setTheme('auto');
      }
    };

    mediaQuery.addEventListener('change', handleThemeChange);
    
    // Initialize performance monitoring
    performanceMonitor.initialize();
    
    // Initialize database
    import('./database/init').then(() => {
      console.log('Database initialized successfully');
    }).catch((error) => {
      console.error('Failed to initialize database:', error);
    });

    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
    };
  }, [theme, setTheme]);

  // Check for active shift and set up beforeunload handler
  useEffect(() => {
    const checkActiveShift = async () => {
      try {
        const activeShift = await shiftService.getActiveShift(terminal);
        if (activeShift) {
          setActiveShiftId(activeShift.id || null);
        } else {
          setActiveShiftId(null);
        }
      } catch (error) {
        console.error('Failed to check active shift:', error);
        setActiveShiftId(null);
      }
    };

    checkActiveShift();

    // Set up beforeunload handler
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (activeShiftId) {
        event.preventDefault();
        event.returnValue = 'You have an open shift. Please complete the day-end summary before closing.';
        setShowDayEndModal(true);
        return 'You have an open shift. Please complete the day-end summary before closing.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [terminal, activeShiftId]);

  const handleOpenZReport = () => {
    // Navigate to Z report or open Z report modal
    console.log('Opening Z Report for shift:', activeShiftId);
    // TODO: Implement Z report navigation
  };

  const handleCloseDayEndModal = () => {
    setShowDayEndModal(false);
  };

  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <Routes>
        {/* Public routes - no layout */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes - with layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Sales Routes */}
          <Route 
            path="pos" 
            element={
              <FeatureLazyRoute 
                feature="sales.view" 
                importFn={() => import('@/pages/pos')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="sales" 
            element={
              <FeatureLazyRoute 
                feature="sales.view" 
                importFn={() => import('@/pages/pos')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="quick-sales" 
            element={
              <FeatureLazyRoute 
                feature="sales.quick" 
                importFn={() => import('@/pages/QuickSales')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Returns Routes */}
          <Route 
            path="returns" 
            element={
              <LazyRoute 
                feature="sales.return" 
                permission="sales.return"
                importFn={() => import('@/pages/Returns')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="sales-return" 
            element={
              <LazyRoute 
                feature="sales.return" 
                permission="sales.return"
                importFn={() => import('@/pages/SalesReturn')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Product Management Routes */}
          <Route 
            path="products" 
            element={
              <LazyRoute 
                feature="products.view" 
                permission="products.view"
                importFn={() => import('@/pages/Products')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="customers" 
            element={
              <LazyRoute 
                feature="customers.view" 
                permission="customers.view"
                importFn={() => import('@/pages/Customers')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="suppliers" 
            element={
              <LazyRoute 
                feature="suppliers.view" 
                permission="suppliers.view"
                importFn={() => import('@/pages/Suppliers')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="pricing" 
            element={
              <LazyRoute 
                feature="pricing.view" 
                permission="pricing.view"
                importFn={() => import('@/pages/Pricing')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="discounts" 
            element={
              <LazyRoute 
                feature="discounts.view" 
                permission="discounts.view"
                importFn={() => import('@/pages/Discounts')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Inventory Routes */}
          <Route 
            path="inventory" 
            element={
              <LazyRoute 
                feature="inventory.view" 
                permission="inventory.view"
                importFn={() => import('@/pages/Inventory')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="inventory/adjust" 
            element={
              <LazyRoute 
                feature="inventory.adjust" 
                permission="inventory.adjust"
                importFn={() => import('@/pages/InventoryAdjustment')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="stock" 
            element={
              <LazyRoute 
                feature="inventory.view" 
                permission="inventory.view"
                importFn={() => import('@/pages/StockDashboard')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="labels" 
            element={
              <LazyRoute 
                feature="labels.view" 
                permission="labels.view"
                importFn={() => import('@/pages/Labels')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Stocktake Routes */}
          <Route 
            path="stocktake" 
            element={
              <LazyRoute 
                feature="inventory.stocktake" 
                permission="inventory.stocktake"
                importFn={() => import('@/pages/Stocktake')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="stocktake/session/:id" 
            element={
              <LazyRoute 
                feature="inventory.stocktake" 
                permission="inventory.stocktake"
                importFn={() => import('@/pages/StocktakeSession')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* GRN Routes */}
          <Route 
            path="grn" 
            element={
              <LazyRoute 
                feature="inventory.receive" 
                permission="inventory.receive"
                importFn={() => import('@/pages/GrnList')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="grn/new" 
            element={
              <LazyRoute 
                feature="inventory.receive" 
                permission="inventory.receive"
                importFn={() => import('@/pages/purchasing/GRN')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="grn/:id" 
            element={
              <LazyRoute 
                feature="inventory.receive" 
                permission="inventory.receive"
                importFn={() => import('@/pages/GRNReceive')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Purchasing Routes */}
          <Route 
            path="purchasing/po" 
            element={
              <LazyRoute 
                feature="purchasing.po" 
                permission="purchasing.po"
                importFn={() => import('@/pages/purchasing/POCreate')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="purchasing/grn" 
            element={
              <LazyRoute 
                feature="inventory.receive" 
                permission="inventory.receive"
                importFn={() => import('@/pages/purchasing/GRNReceive')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="purchasing/supplier-return" 
            element={
              <LazyRoute 
                feature="purchasing.return" 
                permission="purchasing.return"
                importFn={() => import('@/pages/purchasing/SupplierReturn')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Cash Management Routes */}
          <Route 
            path="cash/drawer" 
            element={
              <LazyRoute 
                feature="cash.manage" 
                permission="cash.manage"
                importFn={() => import('@/components/cash/DrawerOps')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
                componentProps={{ shiftId: 1 }}
              />
            } 
          />
          
          {/* Shift Management Routes */}
          <Route 
            path="shifts" 
            element={
              <LazyRoute 
                feature="shifts.view" 
                permission="shifts.view"
                importFn={() => import('@/pages/ShiftList')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="shifts/new" 
            element={
              <LazyRoute 
                feature="shifts.create" 
                permission="shifts.create"
                importFn={() => import('@/pages/NewShift')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="shifts/:id" 
            element={
              <LazyRoute 
                feature="shifts.view" 
                permission="shifts.view"
                importFn={() => import('@/pages/ShiftSession')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Reports Routes */}
          <Route 
            path="reports" 
            element={
              <LazyRoute 
                feature="reports.view" 
                permission="reports.view"
                importFn={() => import('@/pages/Reports')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Settings Routes */}
          <Route 
            path="settings" 
            element={
              <LazyRoute 
                feature="settings.view" 
                permission="settings.view"
                importFn={() => import('@/pages/Settings')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="users" 
            element={
              <RoleLazyRoute 
                role="admin" 
                roles={['manager']}
                requireAny={true}
                importFn={() => import('@/pages/Users')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="audit" 
            element={
              <RoleLazyRoute 
                role="admin" 
                roles={['manager']}
                requireAny={true}
                importFn={() => import('@/pages/Audit')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="admin/features" 
            element={
              <RoleLazyRoute 
                role="admin" 
                importFn={() => import('@/pages/admin/FeaturesAccessPage')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Tools Routes */}
          <Route 
            path="tools/receipt-test" 
            element={
              <LazyRoute 
                feature="tools.receipt" 
                permission="tools.receipt"
                importFn={() => import('@/pages/ReceiptTest')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="tools/print-test" 
            element={
              <LazyRoute 
                feature="tools.print" 
                permission="tools.print"
                importFn={() => import('@/pages/PrintTest')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="tools/navigation-test" 
            element={
              <LazyRoute 
                feature="tools.navigation" 
                permission="tools.navigation"
                importFn={() => import('@/pages/TestNavigation')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="tools/simple-test" 
            element={
              <LazyRoute 
                feature="tools.simple" 
                permission="tools.simple"
                importFn={() => import('@/pages/SimpleTest')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="tools/language-test" 
            element={
              <LazyRoute 
                feature="tools.language" 
                permission="tools.language"
                importFn={() => import('@/components/LanguageTest')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          
          {/* Utility Routes */}
          <Route 
            path="search" 
            element={
              <FeatureLazyRoute 
                feature="search.view" 
                importFn={() => import('@/pages/Search')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="about" 
            element={
              <About />
            } 
          />
          <Route 
            path="help-support" 
            element={
              <FeatureLazyRoute 
                feature="help.view" 
                importFn={() => import('@/pages/HelpSupport')}
                fallbackPath="/not-available"
                loadingComponent={PageLoading}
              />
            } 
          />
          <Route 
            path="health" 
            element={
              <HealthCheck />
            } 
          />
          
          {/* Not Available Route */}
          <Route path="not-available" element={<NotAvailable />} />
        </Route>
      </Routes>
      
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#374151',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '400px',
          },
          className: 'notification-toast',
        }}
      />

      {/* Day-End Summary Modal */}
      {activeShiftId && (
        <DayEndSummaryModal
          isOpen={showDayEndModal}
          onClose={handleCloseDayEndModal}
          onOpenZReport={handleOpenZReport}
          shiftId={activeShiftId}
          terminal={terminal}
        />
      )}
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

export default App;
