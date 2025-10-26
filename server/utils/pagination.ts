/**
 * Pagination utilities for consistent API responses
 */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: {
    items: T[];
  };
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationQuery {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
}

/**
 * Parse and validate pagination parameters from query string
 */
export function parsePaginationParams(query: any, defaultPageSize: number = 20): PaginationQuery {
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(query.pageSize as string) || defaultPageSize));
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  return { page, pageSize, offset, limit };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    pages: Math.ceil(total / pageSize)
  };
}

/**
 * Create a standardized paginated response
 */
export function createPaginatedResponse<T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number
): PaginatedResponse<T> {
  return {
    success: true,
    data: {
      items
    },
    meta: calculatePaginationMeta(page, pageSize, total)
  };
}

/**
 * Validate page size against allowed values
 */
export function validatePageSize(pageSize: number, allowedSizes: number[] = [10, 20, 50, 100, 200]): boolean {
  return allowedSizes.includes(pageSize);
}

/**
 * Get default page size based on context
 */
export function getDefaultPageSize(context: 'list' | 'search' | 'admin' = 'list'): number {
  switch (context) {
    case 'search':
      return 20;
    case 'admin':
      return 50;
    case 'list':
    default:
      return 20;
  }
}







