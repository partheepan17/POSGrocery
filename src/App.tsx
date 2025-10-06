import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/Layout/Layout';
import SalesPage from '@/pages/pos';
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
import GRNList from '@/pages/GRNList';
import GRNReceive from '@/pages/GRNReceive';
import ShiftList from '@/pages/ShiftList';
import ShiftSession from '@/pages/ShiftSession';
import NewShift from '@/pages/NewShift';
import Audit from '@/pages/Audit';
import Users from '@/pages/Users';
import { TestNavigation } from '@/pages/TestNavigation';
import { SimpleTest } from '@/pages/SimpleTest';
import About from '@/pages/About';
import Search from '@/pages/Search';
import { useAppStore } from '@/store/appStore';


function App() {
  const { theme, setTheme } = useAppStore();

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

  return (
    <Routes>
      {/* Public routes - no layout */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected routes - with layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<SalesPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="returns" element={<Returns />} />
        <Route path="products" element={<Products />} />
        <Route path="customers" element={<Customers />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="discounts" element={<Discounts />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="labels" element={<Labels />} />
        <Route path="stocktake" element={<Stocktake />} />
        <Route path="stocktake/session/:id" element={<StocktakeSession />} />
        <Route path="grn" element={<GRNList />} />
        <Route path="grn/new" element={<GRNReceive />} />
        <Route path="grn/:id" element={<GRNReceive />} />
        <Route path="shifts" element={<ShiftList />} />
        <Route path="shifts/new" element={<NewShift />} />
        <Route path="shifts/:id" element={<ShiftSession />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="users" element={<Users />} />
        <Route path="audit" element={<Audit />} />
        <Route path="tools/receipt-test" element={<ReceiptTest />} />
        <Route path="tools/navigation-test" element={<TestNavigation />} />
        <Route path="tools/simple-test" element={<SimpleTest />} />
        <Route path="search" element={<Search />} />
        <Route path="about" element={<About />} />
        <Route path="health" element={<HealthCheck />} />
      </Route>
    </Routes>
  );
}

export default App;