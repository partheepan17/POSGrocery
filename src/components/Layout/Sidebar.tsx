import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Truck, 
  Users, 
  Percent, 
  Warehouse, 
  BarChart3, 
  Settings, 
  Cloud,
  Activity,
  Menu,
  X,
  ClipboardCheck,
  FileInput,
  Shield,
  UserCog,
  RotateCcw,
  Tags,
  Barcode,
  Tag,
  PackagePlus,
  Clock,
  Pause,
  Database,
  Printer,
  CreditCard,
  Receipt,
  TrendingUp,
  FileText,
  Calculator,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Star,
  Home,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Plus,
  Minus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Bell,
  MessageSquare,
  HelpCircle,
  Info,
  AlertTriangle,
  Check,
  XCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  MoreVertical,
  Grid,
  List,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Globe,
  Wifi,
  WifiOff,
  Battery,
  BatteryLow,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Desktop,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Wrench,
  Tool,
  Hammer,
  Screwdriver,
  Key,
  KeyRound,
  Fingerprint,
  Scan,
  QrCode,
  Camera,
  Video,
  Mic,
  MicOff,
  Headphones,
  Speaker,
  Volume1,
  Play,
  PauseCircle,
  StopCircle,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  RotateCw,
  Maximize,
  Minimize,
  Move,
  Move3D,
  MoveHorizontal,
  MoveVertical,
  MoveDiagonal,
  MoveDiagonal2,
  MoveUp,
  MoveDown,
  MoveLeft,
  MoveRight,
  ArrowUpDown,
  ArrowLeftRight,
  ArrowUpLeft,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpFromLine,
  ArrowDownFromLine,
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpLeftFromSquare,
  ArrowUpRightFromSquare,
  ArrowDownLeftFromSquare,
  ArrowDownRightFromSquare,
  ArrowUpFromSquare,
  ArrowDownFromSquare,
  ArrowLeftFromSquare,
  ArrowRightFromSquare,
  ArrowUpToSquare,
  ArrowDownToSquare,
  ArrowLeftToSquare,
  ArrowRightToSquare,
  ArrowUpFromDot,
  ArrowDownFromDot,
  ArrowLeftFromDot,
  ArrowRightFromDot,
  ArrowUpToDot,
  ArrowDownToDot,
  ArrowLeftToDot,
  ArrowRightToDot,
  ArrowUpFromCircle,
  ArrowDownFromCircle,
  ArrowLeftFromCircle,
  ArrowRightFromCircle,
  ArrowUpToCircle,
  ArrowDownToCircle,
  ArrowLeftToCircle,
  ArrowRightToCircle,
  ArrowUpFromTriangle,
  ArrowDownFromTriangle,
  ArrowLeftFromTriangle,
  ArrowRightFromTriangle,
  ArrowUpToTriangle,
  ArrowDownToTriangle,
  ArrowLeftToTriangle,
  ArrowRightToTriangle,
  ArrowUpFromDiamond,
  ArrowDownFromDiamond,
  ArrowLeftFromDiamond,
  ArrowRightFromDiamond,
  ArrowUpToDiamond,
  ArrowDownToDiamond,
  ArrowLeftToDiamond,
  ArrowRightToDiamond,
  ArrowUpFromHexagon,
  ArrowDownFromHexagon,
  ArrowLeftFromHexagon,
  ArrowRightFromHexagon,
  ArrowUpToHexagon,
  ArrowDownToHexagon,
  ArrowLeftToHexagon,
  ArrowRightToHexagon,
  ArrowUpFromOctagon,
  ArrowDownFromOctagon,
  ArrowLeftFromOctagon,
  ArrowRightFromOctagon,
  ArrowUpToOctagon,
  ArrowDownToOctagon,
  ArrowLeftToOctagon,
  ArrowRightToOctagon,
  ArrowUpFromPentagon,
  ArrowDownFromPentagon,
  ArrowLeftFromPentagon,
  ArrowRightFromPentagon,
  ArrowUpToPentagon,
  ArrowDownToPentagon,
  ArrowLeftToPentagon,
  ArrowRightToPentagon,
  Code,
  Terminal
} from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/utils/cn';
// import { authService } from '@/services/authService';
// import { Permission } from '@/security/permissions';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut: string;
  permission?: string;
}

interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const navigationSections: NavigationSection[] = [
  {
    title: 'Operations',
    items: [
      { name: 'Sales', href: '/', icon: ShoppingCart, shortcut: 'Ctrl+1' },
      { name: 'Returns', href: '/returns', icon: RotateCcw, shortcut: 'F9' },
      { name: 'Shifts', href: '/shifts', icon: Clock, shortcut: 'Ctrl+Shift+S' },
    ]
  },
  {
    title: 'Catalog',
    items: [
      { name: 'Products', href: '/products', icon: Package, shortcut: 'Ctrl+2' },
      { name: 'Price Management', href: '/pricing', icon: DollarSign, shortcut: 'Ctrl+3' },
      { name: 'Suppliers', href: '/suppliers', icon: Truck, shortcut: 'Ctrl+4' },
      { name: 'Customers', href: '/customers', icon: Users, shortcut: 'Ctrl+5' },
      { name: 'Discounts', href: '/discounts', icon: Percent, shortcut: 'Ctrl+6' },
    ]
  },
  {
    title: 'Inventory',
    items: [
      { name: 'Stock Levels', href: '/inventory', icon: Warehouse, shortcut: 'Ctrl+7' },
      { name: 'Labels', href: '/labels', icon: Tag, shortcut: 'Ctrl+L' },
      { name: 'Stocktake', href: '/stocktake', icon: ClipboardCheck, shortcut: 'F12' },
      { name: 'GRN', href: '/grn', icon: FileInput, shortcut: 'Ctrl+G' },
    ]
  },
  {
    title: 'Reports & Analytics',
    items: [
      { name: 'Sales Report', href: '/reports', icon: BarChart3, shortcut: 'Ctrl+8' },
      { name: 'Audit Trail', href: '/audit', icon: Shield, shortcut: 'Ctrl+A' },
    ]
  },
  {
    title: 'Tools',
    items: [
      { name: 'Search', href: '/search', icon: Search, shortcut: 'Ctrl+F' },
      { name: 'Receipt Test', href: '/tools/receipt-test', icon: Printer, shortcut: 'F2' },
      { name: 'Navigation Test', href: '/tools/navigation-test', icon: HelpCircle, shortcut: 'F3' },
      { name: 'Simple Test', href: '/tools/simple-test', icon: Activity, shortcut: 'F4' },
    ]
  },
  {
    title: 'Administration',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings, shortcut: 'Ctrl+9' },
      { name: 'Users', href: '/users', icon: UserCog, shortcut: 'Ctrl+U' },
      { name: 'Health Check', href: '/health', icon: Activity, shortcut: 'Ctrl+H' },
      { name: 'About', href: '/about', icon: Shield, shortcut: 'Ctrl+I' },
    ]
  }
];

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Operations', 'Catalog', 'Inventory']));

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const renderNavigationItem = (item: NavigationItem) => (
    <NavLink
      key={item.name}
      to={item.href}
      className={({ isActive }) =>
        cn(
          "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800",
          isActive
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 transform scale-[1.02]"
            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100 hover:transform hover:scale-[1.01]"
        )
      }
      onClick={() => {
        console.log('🔍 Sidebar click:', item.name, 'href:', item.href);
        setSidebarOpen(false);
      }}
    >
      <item.icon className={cn(
        "mr-3 h-4 w-4 flex-shrink-0 transition-colors",
        "group-hover:scale-110 transition-transform duration-200"
      )} />
      <span className="flex-1 truncate text-sm">{item.name}</span>
      <span className={cn(
        "text-xs font-mono px-1.5 py-0.5 rounded transition-colors",
        "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
        "group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
      )}>
        {item.shortcut}
      </span>
    </NavLink>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              viRtual POS
            </h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-4 px-3 overflow-y-auto flex-1">
          <div className="space-y-6">
            {navigationSections.map((section) => (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-200 dark:border-gray-700 pb-1.5 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                >
                  <span>{section.title}</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    expandedSections.has(section.title) && "rotate-180"
                  )} />
                </button>
                <div className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  expandedSections.has(section.title) ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
                )}>
                  <div className="space-y-0.5 pb-2">
                    {section.items.map(renderNavigationItem)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center font-medium">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Version 1.0.0</span>
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500">
              viRtual POS © Virtual Software Pvt Ltd
            </div>
          </div>
        </div>
      </div>
    </>
  );
}