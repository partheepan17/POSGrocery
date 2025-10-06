import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Sun, Moon, Monitor, Maximize, Minimize, Search, Bell, User, ChevronDown, Settings, LogOut, HelpCircle, Clock, ShoppingCart } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { useUIStore } from '@/store/uiStore';
import { OnlineStatusToggle } from '@/components/OnlineStatusToggle';
import { authService } from '@/services/authService';
import { cn } from '@/utils/cn';

export function Header() {
  const navigate = useNavigate();
  const { 
    theme, 
    setTheme, 
    sidebarOpen, 
    setSidebarOpen, 
    fullscreen, 
    toggleFullscreen 
  } = useAppStore();
  
  const { 
    userRole, 
    userName, 
    terminalId, 
    printLanguage,
    updateTime 
  } = useUIStore();
  
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Health check
  const checkOnlineStatus = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100';
      const response = await fetch(`${apiBaseUrl}/api/health`);
      const data = await response.json();
      setIsOnline(data.status === 'ok');
    } catch (error) {
      setIsOnline(false);
    }
  };

  // Update time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      updateTime();
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [updateTime]);

  // Health check every 15 seconds
  useEffect(() => {
    checkOnlineStatus();
    const healthInterval = setInterval(checkOnlineStatus, 15000);
    return () => clearInterval(healthInterval);
  }, []);

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
    navigate('/health'); // Help & Support goes to Health Check for now
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await authService.logout();
    navigate('/login');
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
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 h-16 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 lg:hidden transition-all duration-200 hover:scale-105"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="hidden lg:block">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">VP</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Point of Sale
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                Terminal System
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Center Section - Status and Navigation */}
      <div className="hidden lg:flex items-center space-x-3 px-2">
        {/* Online Status Toggle */}
        <OnlineStatusToggle onStatusChange={(status) => setIsOnline(status)} />
        
        {/* Time */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {currentTime.toLocaleTimeString()}
        </div>
        
        {/* Retail */}
        <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
          Retail
        </div>
        
        {/* Cashier Admin */}
        <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm">
          {userRole === 'manager' ? 'MANAGER' : 'CASHIER'} {userName}
        </div>
        
        {/* Sales */}
        <button
          onClick={() => navigate('/pos')}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Sales
        </button>
        
        {/* Returns */}
        <button
          onClick={() => navigate('/returns')}
          className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
        >
          Returns
        </button>
        
        {/* Products */}
        <button
          onClick={() => navigate('/products')}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          Products
        </button>
        
        {/* Inventory */}
        <button
          onClick={() => navigate('/inventory')}
          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
        >
          Inventory
        </button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        {/* Enhanced Search */}
        <div className="relative" data-dropdown>
          <button 
            onClick={() => setSearchOpen(!searchOpen)}
            className={cn(
              "p-2.5 rounded-lg transition-all duration-200 hover:scale-105",
              searchOpen 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" 
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80"
            )}
            title="Search (Ctrl+K)"
          >
          <Search className="w-5 h-5" />
        </button>

          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products, customers..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">Ctrl+K</kbd> to search anywhere
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Notifications */}
        <div className="relative" data-dropdown>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={cn(
              "p-2.5 rounded-lg transition-all duration-200 hover:scale-105 relative",
              notificationsOpen 
                ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" 
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80"
            )}
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-[10px] text-white font-bold">3</span>
            </span>
          </button>
          
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">Low stock alert</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Milk (2L) - Only 5 units left</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">2 minutes ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">Sale completed</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Transaction #1234 - $45.67</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">5 minutes ago</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-gray-100">System update</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">New features available</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">1 hour ago</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 border-t border-gray-200 dark:border-gray-700">
                <button className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>


        {/* Enhanced Theme Toggle */}
        <button
          onClick={handleThemeToggle}
          className="p-2.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105"
          title={`Current theme: ${theme}`}
        >
          <div className="relative">
          {getThemeIcon()}
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full opacity-60"></div>
          </div>
        </button>


        {/* Enhanced Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-2.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105"
          title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {fullscreen ? (
            <Minimize className="w-5 h-5" />
          ) : (
            <Maximize className="w-5 h-5" />
          )}
        </button>

        {/* Enhanced User Menu */}
        <div className="relative ml-3" data-dropdown>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100/80 dark:hover:bg-gray-700/80 transition-all duration-200 hover:scale-105"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Admin User
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">
                Administrator
          </div>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-400 transition-transform duration-200",
              userMenuOpen && "rotate-180"
            )} />
          </button>
          
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">Admin User</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">admin@grocery.com</div>
                  </div>
                </div>
              </div>
              
              <div className="py-2">
                <button 
                  onClick={handleProfileClick}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <button 
                  onClick={handleSettingsClick}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <button 
                  onClick={handleHelpClick}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Help & Support</span>
                </button>
                <button 
                  onClick={() => { setUserMenuOpen(false); navigate('/about'); }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>About & License</span>
                </button>
              </div>
              
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

