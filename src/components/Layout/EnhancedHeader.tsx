import React from 'react';
import { Menu, Sun, Moon, Monitor, Maximize, Minimize, Search, Bell, User, Settings, LogOut } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { authService } from '@/services/authService';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { 
  Dropdown, 
  DropdownMenu, 
  DropdownItem, 
  DropdownSeparator 
} from '@/components/ui/Dropdown';
import { NotificationBadge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ScreenReaderOnly } from '@/components/ui/A11y';

interface EnhancedHeaderProps {
  className?: string;
}

export function EnhancedHeader({ className }: EnhancedHeaderProps) {
  const navigate = useNavigate();
  const { 
    theme, 
    setTheme, 
    sidebarOpen, 
    setSidebarOpen, 
    fullscreen, 
    toggleFullscreen,
    currentUser,
    currentSession
  } = useAppStore();

  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const [notificationCount] = React.useState(3); // Mock notification count

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

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Implement global search functionality
      console.log('Searching for:', query);
      // Navigate to search results or trigger search overlay
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
      setShowSearch(false);
    } else if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  // Global keyboard shortcuts
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      // F11 for fullscreen
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleFullscreen]);

  return (
    <header className={cn(
      'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
      'h-16 flex items-center justify-between px-4 lg:px-6 relative z-40',
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        
        {/* Logo/Brand */}
        <div className="hidden lg:flex items-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Grocery POS System
          </h1>
          {currentSession && (
            <div className="ml-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Session #{currentSession.id}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Center Section - Search */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        {showSearch ? (
          <Input
            autoFocus
            placeholder="Search products, customers, orders... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!searchQuery) setShowSearch(false);
            }}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full"
          />
        ) : (
          <Button
            variant="ghost"
            onClick={() => setShowSearch(true)}
            className="w-full justify-start text-gray-500 dark:text-gray-400"
          >
            <Search className="w-4 h-4 mr-2" />
            Search... (Ctrl+K)
          </Button>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSearch(!showSearch)}
          className="md:hidden"
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <NotificationBadge>
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${notificationCount} notifications`}
          >
            <Bell className="w-5 h-5" />
          </Button>
        </NotificationBadge>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThemeToggle}
          aria-label={`Current theme: ${theme}. Click to change theme`}
        >
          {getThemeIcon()}
        </Button>

        {/* Fullscreen Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="hidden sm:flex"
        >
          {fullscreen ? (
            <Minimize className="w-5 h-5" />
          ) : (
            <Maximize className="w-5 h-5" />
          )}
        </Button>

        {/* User Menu */}
        <Dropdown
          trigger={
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-700 dark:text-primary-300" />
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {currentUser?.name || 'User'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {currentUser?.role || 'Employee'}
                </div>
              </div>
            </Button>
          }
          align="right"
        >
          <DropdownMenu>
            <DropdownItem onClick={() => navigate('/settings')}>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </div>
            </DropdownItem>
            <DropdownItem onClick={() => navigate('/shifts')}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Shift Management
              </div>
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={handleLogout}>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <LogOut className="w-4 h-4" />
                Logout
              </div>
            </DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </div>

      {/* Mobile Search Overlay */}
      {showSearch && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-50">
          <Input
            autoFocus
            placeholder="Search products, customers, orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full"
          />
        </div>
      )}

      {/* Screen Reader Content */}
      <ScreenReaderOnly>
        <div>
          Current user: {currentUser?.name || 'Not logged in'}
          {currentSession && `, Session: ${currentSession.id}`}
          , Theme: {theme}
          {notificationCount > 0 && `, ${notificationCount} unread notifications`}
        </div>
      </ScreenReaderOnly>
    </header>
  );
}

