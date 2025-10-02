import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/utils/cn';

export function Layout() {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        sidebarOpen ? "lg:ml-0" : "lg:ml-0"
      )}>
        <Header />
        
        <main className="flex-1 overflow-auto">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}




