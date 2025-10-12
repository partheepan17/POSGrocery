import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout/Layout';
import { performanceMonitor } from '@/lib/performance';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { DayEndSummaryModal } from '@/components/pos/DayEndSummaryModal';
import { shiftService } from '@/services/shiftService';
import SalesPage from '@/pages/pos';
import QuickSalesPage from '@/pages/QuickSales';
import { Products } from '@/pages/Products';
import { Customers } from '@/pages/Customers';
import { Suppliers } from '@/pages/Suppliers';
import { Pricing } from '@/pages/Pricing';
import { Discounts } from '@/pages/Discounts';
import { Inventory } from '@/pages/Inventory';
import { Labels } from '@/pages/Labels';
import { Reports } from '@/pages/Reports';
import { Settings } from '@/pages/Settings';
import { ReceiptTest } from '@/pages/ReceiptTest';
import HealthCheck from '@/pages/HealthCheck';
import Login from '@/pages/Login';
import Returns from '@/pages/Returns';
import Stocktake from '@/pages/Stocktake';
import StocktakeSession from '@/pages/StocktakeSession';
import Grn from '@/pages/Grn';
import GRNList from '@/pages/GrnList';
import GRNReceive from '@/pages/GRNReceive';
import ShiftList from '@/pages/ShiftList';
import ShiftSession from '@/pages/ShiftSession';
import NewShift from '@/pages/NewShift';
import Audit from '@/pages/Audit';
import Users from '@/pages/Users';
import { TestNavigation } from '@/pages/TestNavigation';
import { SimpleTest } from '@/pages/SimpleTest';
import { PrintTest } from '@/pages/PrintTest';
import About from '@/pages/About';
import Search from '@/pages/Search';
import { LanguageTest } from '@/components/LanguageTest';
import { HelpSupport } from '@/pages/HelpSupport';
import StockDashboard from '@/pages/StockDashboard';
import { useAppStore } from '@/store/appStore';
import POCreate from '@/pages/purchasing/POCreate';
import GRNReceive2 from '@/pages/purchasing/GRNReceive';
import SupplierReturn from '@/pages/purchasing/SupplierReturn';
import DrawerOps from '@/components/cash/DrawerOps';


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
      <Routes>
        {/* Public routes - no layout */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes - with layout */}
        <Route path="/" element={<Layout />}>
          <Route index element={<SalesPage />} />
          <Route path="pos" element={<SalesPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="quick-sales" element={<QuickSalesPage />} />
          <Route path="returns" element={<Returns />} />
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="discounts" element={<Discounts />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="stock" element={<StockDashboard />} />
          <Route path="labels" element={<Labels />} />
          <Route path="stocktake" element={<Stocktake />} />
          <Route path="stocktake/session/:id" element={<StocktakeSession />} />
          <Route path="grn" element={<GRNList />} />
          <Route path="grn/new" element={<GRNReceive />} />
          <Route path="grn/:id" element={<GRNReceive />} />
          <Route path="purchasing/po" element={<POCreate />} />
          <Route path="purchasing/grn" element={<GRNReceive2 />} />
          <Route path="purchasing/supplier-return" element={<SupplierReturn />} />
          <Route path="cash/drawer" element={<DrawerOps shiftId={1} />} />
          <Route path="shifts" element={<ShiftList />} />
          <Route path="shifts/new" element={<NewShift />} />
          <Route path="shifts/:id" element={<ShiftSession />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<Users />} />
          <Route path="audit" element={<Audit />} />
          <Route path="tools/receipt-test" element={<ReceiptTest />} />
          <Route path="tools/print-test" element={<PrintTest />} />
          <Route path="tools/navigation-test" element={<TestNavigation />} />
          <Route path="tools/simple-test" element={<SimpleTest />} />
          <Route path="tools/language-test" element={<LanguageTest />} />
          <Route path="search" element={<Search />} />
          <Route path="about" element={<About />} />
          <Route path="help-support" element={<HelpSupport />} />
          <Route path="health" element={<HealthCheck />} />
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
    </ErrorBoundary>
  );
}

export default App;