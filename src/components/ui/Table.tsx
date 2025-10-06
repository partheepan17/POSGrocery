import React, { useState, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { LoadingSpinner, SkeletonTable } from './Skeleton';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
  selected?: boolean;
  hover?: boolean;
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ 
    className, 
    children, 
    variant = 'default',
    size = 'md',
    ...props 
  }, ref) => {
    const baseClasses = 'w-full caption-bottom border-collapse';
    
    const variants = {
      default: '',
      striped: '[&_tbody_tr:nth-child(even)]:bg-gray-50 dark:[&_tbody_tr:nth-child(even)]:bg-gray-800/50',
      bordered: 'border border-gray-200 dark:border-gray-700'
    };

    const sizes = {
      sm: 'text-sm',
      md: 'text-sm',
      lg: 'text-base'
    };

    return (
      <div className="relative w-full overflow-auto">
        <table
          className={cn(
            baseClasses,
            variants[variant],
            sizes[size],
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <thead
        className={cn(
          'border-b border-gray-200 dark:border-gray-700',
          '[&_tr]:border-b',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </thead>
    );
  }
);

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tbody
        className={cn(
          '[&_tr:last-child]:border-0',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </tbody>
    );
  }
);

const TableFooter = React.forwardRef<HTMLTableSectionElement, TableFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <tfoot
        className={cn(
          'border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50',
          'font-medium [&>tr]:last:border-b-0',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </tfoot>
    );
  }
);

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ 
    className, 
    children, 
    selected = false, 
    hover = true,
    ...props 
  }, ref) => {
    return (
      <tr
        className={cn(
          'border-b border-gray-200 dark:border-gray-700 transition-colors',
          hover && 'hover:bg-gray-50/50 dark:hover:bg-gray-800/50',
          selected && 'bg-gray-50 dark:bg-gray-800',
          'data-[state=selected]:bg-gray-50 dark:data-[state=selected]:bg-gray-800',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </tr>
    );
  }
);

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ 
    className, 
    children, 
    sortable = false,
    sortDirection = null,
    onSort,
    ...props 
  }, ref) => {
    const content = (
      <>
        {children}
        {sortable && (
          <span className="ml-2 inline-flex flex-col">
            {sortDirection === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : sortDirection === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4 text-gray-400" />
            )}
          </span>
        )}
      </>
    );

    return (
      <th
        className={cn(
          'h-12 px-4 text-left align-middle font-medium text-gray-500 dark:text-gray-400',
          '[&:has([role=checkbox])]:pr-0',
          sortable && 'cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300',
          className
        )}
        ref={ref}
        onClick={sortable ? onSort : undefined}
        {...props}
      >
        {sortable ? (
          <div className="flex items-center">
            {content}
          </div>
        ) : (
          content
        )}
      </th>
    );
  }
);

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <td
        className={cn(
          'p-4 align-middle [&:has([role=checkbox])]:pr-0',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </td>
    );
  }
);

// Enhanced Table with built-in features
interface EnhancedTableColumn<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface EnhancedTableProps<T> {
  data: T[];
  columns: EnhancedTableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T, index: number) => void;
  selectedRows?: Set<number>;
  onRowSelect?: (index: number, selected: boolean) => void;
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function EnhancedTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  sortBy,
  sortDirection,
  onSort,
  onRowClick,
  selectedRows,
  onRowSelect,
  variant = 'default',
  size = 'md',
  className
}: EnhancedTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <SkeletonTable rows={5} columns={columns.length} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No data found</h3>
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  const getCellValue = (row: T, key: keyof T | string): any => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj: any, k) => obj?.[k], row);
    }
    return (row as any)[key];
  };

  return (
    <Table variant={variant} size={size} className={className}>
      <TableHeader>
        <TableRow>
          {onRowSelect && (
            <TableHead className="w-12">
              <input
                type="checkbox"
                className="rounded border-gray-300"
                onChange={(e) => {
                  data.forEach((_, index) => {
                    onRowSelect(index, e.target.checked);
                  });
                }}
                checked={selectedRows ? selectedRows.size === data.length : false}
                {...(selectedRows && selectedRows.size > 0 && selectedRows.size < data.length && { indeterminate: true })}
              />
            </TableHead>
          )}
          {columns.map((column) => (
            <TableHead
              key={String(column.key)}
              sortable={column.sortable}
              sortDirection={sortBy === column.key ? sortDirection : null}
              onSort={column.sortable ? () => onSort?.(String(column.key)) : undefined}
              style={{ width: column.width }}
              className={cn(
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-right'
              )}
            >
              {column.title}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, index) => (
          <TableRow
            key={index}
            selected={selectedRows?.has(index)}
            onClick={onRowClick ? () => onRowClick(row, index) : undefined}
            className={onRowClick ? 'cursor-pointer' : undefined}
          >
            {onRowSelect && (
              <TableCell>
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={selectedRows?.has(index) || false}
                  onChange={(e) => onRowSelect(index, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
            )}
            {columns.map((column) => {
              const value = getCellValue(row, column.key);
              return (
                <TableCell
                  key={String(column.key)}
                  className={cn(
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                >
                  {column.render ? column.render(value, row, index) : String(value || '')}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

Table.displayName = 'Table';
TableHeader.displayName = 'TableHeader';
TableBody.displayName = 'TableBody';
TableFooter.displayName = 'TableFooter';
TableRow.displayName = 'TableRow';
TableHead.displayName = 'TableHead';
TableCell.displayName = 'TableCell';

// Advanced DataTable with search, filtering, and pagination
interface DataTableProps<T> {
  data: T[];
  columns: EnhancedTableColumn<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
  onRowClick?: (row: T, index: number) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
}

function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  filterable = false,
  paginated = true,
  pageSize = 10,
  emptyMessage = 'No data available',
  className,
  variant = 'default',
  size = 'md',
  onRowClick,
  selectable = false,
  onSelectionChange
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm && searchable) {
      filtered = filtered.filter(row =>
        columns.some(column => {
          const value = getCellValue(row, column.key);
          return String(value || '').toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        const aValue = getCellValue(a, sortBy);
        const bValue = getCellValue(b, sortBy);
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortBy, sortDirection, columns, searchable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) return filteredData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize, paginated]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const getCellValue = (row: T, key: keyof T | string): any => {
    if (typeof key === 'string' && key.includes('.')) {
      return key.split('.').reduce((obj: any, k) => obj?.[k], row);
    }
    return (row as any)[key];
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDirection('asc');
    }
  };

  const handleRowSelect = (index: number, selected: boolean) => {
    const newSelectedRows = new Set(selectedRows);
    const actualIndex = (currentPage - 1) * pageSize + index;
    
    if (selected) {
      newSelectedRows.add(actualIndex);
    } else {
      newSelectedRows.delete(actualIndex);
    }
    
    setSelectedRows(newSelectedRows);
    
    if (onSelectionChange) {
      const selectedData = Array.from(newSelectedRows).map(i => data[i]);
      onSelectionChange(selectedData);
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const allIndices = new Set(
        Array.from({ length: filteredData.length }, (_, i) => i)
      );
      setSelectedRows(allIndices);
      onSelectionChange?.(filteredData);
    } else {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {searchable && (
          <div className="flex items-center justify-between">
            <div className="h-10 w-80 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
        )}
        <SkeletonTable rows={pageSize} columns={columns.length} />
        {paginated && (
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex space-x-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filter Bar */}
      {(searchable || filterable) && (
        <div className="flex items-center justify-between gap-4">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page when searching
                }}
                className="pl-10"
              />
            </div>
          )}
          
          {filterable && (
            <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
              Filters
            </Button>
          )}
          
          {selectable && selectedRows.size > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedRows.size} of {filteredData.length} selected
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <EnhancedTable
          data={paginatedData}
          columns={columns}
          variant={variant}
          size={size}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={onRowClick}
          selectedRows={selectable ? selectedRows : undefined}
          onRowSelect={selectable ? handleRowSelect : undefined}
          emptyMessage={searchTerm ? `No results found for "${searchTerm}"` : emptyMessage}
        />
      </div>

      {/* Pagination */}
      {paginated && filteredData.length > pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length} results
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              leftIcon={<ChevronLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
              
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { 
  Table, 
  TableHeader, 
  TableBody, 
  TableFooter, 
  TableRow, 
  TableHead, 
  TableCell,
  EnhancedTable,
  DataTable
};

export type { 
  TableProps, 
  TableHeaderProps, 
  TableBodyProps, 
  TableFooterProps,
  TableRowProps, 
  TableHeadProps, 
  TableCellProps,
  EnhancedTableProps,
  EnhancedTableColumn,
  DataTableProps
};
