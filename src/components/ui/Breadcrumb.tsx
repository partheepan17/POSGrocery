import React from 'react';
import { cn } from '@/utils/cn';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHome?: boolean;
  homeHref?: string;
  className?: string;
  maxItems?: number;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <ChevronRight className="w-4 h-4 text-gray-400" />,
  showHome = true,
  homeHref = '/',
  className,
  maxItems = 5
}) => {
  // Add home item if showHome is true and not already present
  const allItems = showHome && items.length > 0 && items[0].href !== homeHref
    ? [{ label: 'Home', href: homeHref, icon: <Home className="w-4 h-4" /> }, ...items]
    : items;

  // Truncate items if exceeding maxItems
  const displayItems = allItems.length > maxItems
    ? [
        ...allItems.slice(0, 1), // First item
        { label: '...', href: undefined }, // Ellipsis
        ...allItems.slice(-(maxItems - 2)) // Last items
      ]
    : allItems;

  return (
    <nav 
      aria-label="Breadcrumb" 
      className={cn('flex items-center space-x-1 text-sm', className)}
    >
      <ol className="flex items-center space-x-1" role="list">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === '...';

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <span className="mx-2 flex-shrink-0" aria-hidden="true">
                  {separator}
                </span>
              )}
              
              {isEllipsis ? (
                <span className="text-gray-500 dark:text-gray-400 px-2">
                  {item.label}
                </span>
              ) : isLast || (item as any).current ? (
                <span 
                  className="flex items-center gap-1.5 text-gray-900 dark:text-gray-100 font-medium"
                  aria-current="page"
                >
                  {item.icon}
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  to={item.href}
                  className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  {item.icon}
                  {item.label}
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  {item.icon}
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Enhanced Breadcrumb with automatic route generation
interface AutoBreadcrumbProps {
  customLabels?: Record<string, string>;
  customIcons?: Record<string, React.ReactNode>;
  hideRoutes?: string[];
  className?: string;
  maxItems?: number;
}

const AutoBreadcrumb: React.FC<AutoBreadcrumbProps> = ({
  customLabels = {},
  customIcons = {},
  hideRoutes = [],
  className,
  maxItems = 5
}) => {
  const pathname = window.location.pathname;
  const pathSegments = pathname.split('/').filter(Boolean);

  if (pathSegments.length === 0) {
    return null; // Don't show breadcrumb on home page
  }

  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip if this route should be hidden
    if (hideRoutes.includes(currentPath)) {
      return;
    }

    const isLast = index === pathSegments.length - 1;
    const label = customLabels[currentPath] || 
                 customLabels[segment] || 
                 segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    
    items.push({
      label,
      href: isLast ? undefined : currentPath,
      icon: customIcons[currentPath] || customIcons[segment],
      current: isLast
    });
  });

  return <Breadcrumb items={items} className={className} maxItems={maxItems} />;
};

// Page Header with Breadcrumb
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbItems?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbItems,
  actions,
  className
}) => {
  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700 pb-4 mb-6', className)}>
      {breadcrumbItems && breadcrumbItems.length > 0 && (
        <div className="mb-2">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      )}
      
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="ml-4 flex-shrink-0 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export { Breadcrumb, AutoBreadcrumb, PageHeader };
export type { BreadcrumbProps, BreadcrumbItem, AutoBreadcrumbProps, PageHeaderProps };

