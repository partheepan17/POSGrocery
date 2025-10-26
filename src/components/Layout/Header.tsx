import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, Monitor, Maximize, Minimize, Search, Bell, User, ChevronDown, Settings, LogOut, HelpCircle, Clock, ShoppingCart, Keyboard, Bug, Package, Warehouse, Calculator, Power } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/appStore';
import { useUIStore } from '@/store/uiStore';
import { OnlineStatusToggle } from '@/components/OnlineStatusToggle';
import HeaderStatus from '@/components/Layout/HeaderStatus';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import { useNotificationService } from '@/services/notificationService';
import { MobileNav } from '@/components/Layout/MobileNav';
import { OnScreenKeyboard } from '@/components/ui/OnScreenKeyboard';
import { Calculator as CalculatorComponent } from '@/components/ui/Calculator';
import { authService } from '@/services/authService';
import { useAuth, RoleGuard, PermissionGuard } from '@/store/authStore';
import { cn } from '@/utils/cn';
import { useKeyboardHelp } from '@/hooks/useKeyboardHelp';
import { DevTools } from '@/components/dev/DevTools';
import { OfflineQueueStatus } from '@/components/OfflineQueueStatus';
import { healthCheckService, HealthCheckResult } from '@/services/healthCheckService';

export function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { 
    theme, 
    setTheme, 
    sidebarOpen, 
    setSidebarOpen, 
    fullscreen, 
    toggleFullscreen 
  } = useAppStore();
  
  const { setIsHelpOpen, setIsCommandPaletteOpen } = useKeyboardHelp();
  
  const { 
    userRole, 
    userName, 
    terminalId, 
    printLanguage,
    updateTime 
  } = useUIStore();
  
  // Auth state
  const { user, isAuthenticated, canAccess } = useAuth();
  
  // Enhanced notification system
  const {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    unreadCount
  } = useNotificationService();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [systemOnline, setSystemOnline] = useState(true);

  // Use centralized health check service
  useEffect(() => {
    const unsubscribe = healthCheckService.subscribe((result: HealthCheckResult) => {
      setIsOnline(result.isOnline);
    });
    
    return unsubscribe;
  }, []);

  // Update time every 10 seconds (less frequent)
  useEffect(() => {
    const timeInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      updateTime();
    }, 10000); // 10 seconds instead of 1 second

    return () => clearInterval(timeInterval);
  }, [updateTime]);

  // Health check is now handled by the centralized service

  // Initialize system notifications (only in development)
  useEffect(() => {
    if (import.meta.env.DEV && notifications.length === 0) {
      // Add a single system notification for development
      addNotification({
        type: 'info',
        title: 'System Ready',
        message: 'POS system is running in development mode',
        priority: 'low',
        category: 'system'
      });
    }
  }, [notifications.length, addNotification]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProfileClick = () => {
    setUserMenuOpen(false);
    navigate('/users');
  };

  const handleSettingsClick = () => {
    setUserMenuOpen(false);
    navigate('/settings');
  };

  const handleHelpClick = () => {
    setUserMenuOpen(false);
    setIsHelpOpen(true);
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await authService.logout();
    navigate('/login');
  };

  const handleSystemToggle = () => {
    setSystemOnline(!systemOnline);
    // Here you would typically make an API call to toggle system status
    console.log('System status toggled:', !systemOnline ? 'Online' : 'Offline');
  };

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // POS action handlers
  const handleShift = () => {
    navigate('/shifts');
  };

  const handleThemeToggle = () => {
    const themes = ['light', 'dark', 'auto'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />;
      case 'dark':
        return <Moon className="w-4 h-4" />;
      case 'auto':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 flex-shrink-0">
      {/* Left Section - Terminal Name */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="hidden lg:block">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Machine 1
              </h2>
            </div>
          </div>
        </div>
      </div>

      {/* Center Section - Status and Time */}
      <div className="hidden xl:flex items-center space-x-4 px-4 flex-1 max-w-6xl mx-auto">
        {/* Status Section */}
        <div className="flex items-center space-x-3">
          {/* API Status */}
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap",
            isOnline 
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" 
              : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
          )}>
            API: {isOnline ? 'Online' : 'Offline'}
          </div>
          
          {/* Device Status */}
          <div className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap",
            systemOnline 
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200" 
              : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
          )}>
            Devices: {systemOnline ? 'Online' : 'Offline'}
          </div>
          
          {/* System Toggle */}
          <button
            onClick={handleSystemToggle}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              systemOnline 
                ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800" 
                : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            )}
            title={`Toggle system ${systemOnline ? 'offline' : 'online'}`}
          >
            <Power className="w-4 h-4 inline mr-1" />
            {systemOnline ? 'Online' : 'Offline'}
          </button>
          
          {/* Date and Time */}
          <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono">
            {formatDate(currentTime)} {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <div className="xl:hidden flex items-center space-x-1">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200"
          title={t('common.navigation')}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Enhanced Search */}
        <div className="relative" data-dropdown>
          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            className={cn(
              "p-2.5 rounded-lg transition-all duration-200 hover:scale-105",
              "text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80"
            )}
            title="Command Palette (Ctrl+K)"
          >
          <Search className="w-5 h-5" />
        </button>

        </div>

        {/* Enhanced Notifications */}
        <div className="relative" data-dropdown>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={cn(
              "p-3 rounded-xl transition-all duration-200 hover:scale-105 relative shadow-sm",
              notificationsOpen 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400 shadow-md" 
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 hover:shadow-md"
            )}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              </span>
            )}
          </button>
          
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 z-[60]">
              <NotificationCenter
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onDismiss={dismiss}
                onClearAll={clearAll}
                maxHeight="500px"
              />
            </div>
          )}
        </div>


        {/* Action Buttons Group */}
        <div className="flex items-center gap-1">
          {/* On-Screen Keyboard Button */}
          <button
            onClick={() => setKeyboardOpen(true)}
            className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105 hover:shadow-md"
            title="On-Screen Keyboard"
          >
            <Keyboard className="w-5 h-5" />
          </button>

          {/* Calculator Button */}
          <button
            onClick={() => setCalculatorOpen(true)}
            className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105 hover:shadow-md"
            title="Calculator"
          >
            <Calculator className="w-5 h-5" />
          </button>

          {/* Dev Tools Button (Development Only) */}
          {import.meta.env.DEV && (
            <button
              onClick={() => setDevToolsOpen(true)}
              className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105 hover:shadow-md"
              title="Developer Tools"
            >
              <Bug className="w-5 h-5" />
            </button>
          )}

          {/* Settings Button */}
          <button
            onClick={() => navigate('/settings')}
            className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105 hover:shadow-md"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Enhanced Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105 hover:shadow-md"
            title={`Current theme: ${theme}`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light'} theme`}
          >
            <div className="relative">
              {getThemeIcon()}
              <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-60"></div>
            </div>
          </button>

          {/* Enhanced Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-3 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105 hover:shadow-md"
            title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {fullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Enhanced User Menu */}
        <div className="relative ml-2" data-dropdown>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105 hover:shadow-md"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {user?.username || 'Guest User'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest'}
              </div>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200",
              userMenuOpen && "rotate-180"
            )} />
          </button>
          
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-3 z-[60] backdrop-blur-sm">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {user?.username || 'Guest User'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.email || `${user?.role || 'guest'}@grocery.com`}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="py-2">
                <button 
                  onClick={handleProfileClick}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors rounded-lg mx-2"
                >
                  <User className="w-4 h-4" />
                  <span>{t('common.profile')}</span>
                </button>
                
                <button 
                  onClick={handleSettingsClick}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors rounded-lg mx-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>{t('navigation.settings')}</span>
                </button>

                {/* Admin-only menu items */}
                <RoleGuard roles={['admin', 'manager']}>
                  <button 
                    onClick={() => { setUserMenuOpen(false); navigate('/users'); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors rounded-lg mx-2"
                  >
                    <User className="w-4 h-4" />
                    <span>User Management</span>
                  </button>
                  
                  <button 
                    onClick={() => { setUserMenuOpen(false); navigate('/audit'); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors rounded-lg mx-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Audit Logs</span>
                  </button>
                </RoleGuard>

                {/* Admin-only system management */}
                <RoleGuard roles={['admin']}>
                  <button 
                    onClick={() => { setUserMenuOpen(false); navigate('/system'); }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors rounded-lg mx-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>System Administration</span>
                  </button>
                </RoleGuard>
                
                <button 
                  onClick={handleHelpClick}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors rounded-lg mx-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{t('common.help')} & Support</span>
                </button>
                <button 
                  onClick={() => { setUserMenuOpen(false); navigate('/about'); }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors rounded-lg mx-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{t('navigation.about')} & License</span>
                </button>
                
                {/* Logout button */}
                <div className="border-t border-gray-200 dark:border-gray-700 mt-2 pt-2">
                  <button 
                    onClick={() => { 
                      setUserMenuOpen(false); 
                      authService.logout();
                      navigate('/login');
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 transition-colors rounded-lg mx-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </div>

      {/* Dev Tools Modal */}
      <DevTools
        isOpen={devToolsOpen}
        onClose={() => setDevToolsOpen(false)}
      />
      
      {/* On-Screen Keyboard */}
      <OnScreenKeyboard
        isOpen={keyboardOpen}
        onClose={() => setKeyboardOpen(false)}
      />
      
      {/* Calculator */}
      <CalculatorComponent
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
      />
      
      {/* Mobile Navigation */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
    </header>
  );
}

