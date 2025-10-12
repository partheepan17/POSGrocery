import React from 'react';
import { cn } from '@/utils/cn';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  variant?: 'default' | 'striped' | 'bordered' | 'pos';
  size?: 'sm' | 'md' | 'lg';
  density?: 'comfortable' | 'compact';
  stickyHeader?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ 
    className,
    variant = 'default',
    size = 'md',
    density = 'comfortable',
    stickyHeader = false,
    children,
    ...props 
  }, ref) => {
    const baseClasses = 'w-full border-collapse';
    
    const variants = {
      default: 'bg-white dark:bg-gray-800',
      striped: 'bg-white dark:bg-gray-800 [&_tbody_tr:nth-child(even)]:bg-gray-50 dark:[&_tbody_tr:nth-child(even)]:bg-gray-700',
      bordered: 'border border-gray-200 dark:border-gray-700',
      pos: 'bg-white dark:bg-gray-800 shadow-pos'
    };

    const sizes = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };

    const densityClasses = {
      comfortable: '[&_td]:py-3 [&_th]:py-3',
      compact: '[&_td]:py-1.5 [&_th]:py-1.5'
    };

    const stickyClasses = stickyHeader ? 'sticky top-0 z-sticky' : '';

    return (
      <div className="overflow-x-auto">
        <table
          ref={ref}
          className={cn(
            baseClasses,
            variants[variant],
            sizes[size],
            densityClasses[density],
            className
          )}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, sticky = false, children, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn(
        'bg-gray-50 dark:bg-gray-700',
        sticky && 'sticky top-0 z-sticky',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  )
);

TableHeader.displayName = 'TableHeader';

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('divide-y divide-gray-200 dark:divide-gray-700', className)}
      {...props}
    >
      {children}
    </tbody>
  )
);

TableBody.displayName = 'TableBody';

interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, children, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('bg-gray-50 dark:bg-gray-700 font-medium', className)}
      {...props}
    >
      {children}
    </tfoot>
  )
);

TableFooter.displayName = 'TableFooter';

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hover?: boolean;
  selected?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, hover = false, selected = false, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'transition-colors',
        hover && 'hover:bg-gray-50 dark:hover:bg-gray-700',
        selected && 'bg-primary-50 dark:bg-primary-900/20',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
);

TableRow.displayName = 'TableRow';

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ 
    className, 
    sortable = false, 
    sortDirection, 
    onSort,
    children, 
    ...props 
  }, ref) => (
    <th
      ref={ref}
      className={cn(
        'px-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        sortable && 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600',
        className
      )}
      onClick={sortable ? onSort : undefined}
      tabIndex={sortable ? 0 : undefined}
      role={sortable ? 'button' : undefined}
      aria-sort={sortable ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none') : undefined}
      {...props}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && (
          <div className="flex flex-col">
            <ChevronUp 
              className={cn(
                "w-3 h-3",
                sortDirection === 'asc' ? 'text-primary-600' : 'text-gray-400'
              )} 
              aria-hidden="true" 
            />
            <ChevronDown 
              className={cn(
                "w-3 h-3 -mt-1",
                sortDirection === 'desc' ? 'text-primary-600' : 'text-gray-400'
              )} 
              aria-hidden="true" 
            />
          </div>
        )}
      </div>
    </th>
  )
);

TableHead.displayName = 'TableHead';

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, numeric = false, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'px-4 text-sm text-gray-900 dark:text-gray-100',
        numeric && 'text-right font-mono',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
);

TableCell.displayName = 'TableCell';

export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableRow, 
  TableHead, 
  TableCell 
};
export type { 
  TableProps, 
  TableHeaderProps, 
  TableBodyProps, 
  TableFooterProps, 
  TableRowProps, 
  TableHeadProps, 
  TableCellProps 
};
