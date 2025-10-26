import { useState, useEffect, useCallback, useMemo } from 'react';
import { dataService, Product, Category, Supplier } from '@/services/dataService';
import { toast } from 'react-hot-toast';

export interface ProductWithRelations extends Product {
  category?: Category;
  preferred_supplier?: Supplier;
}

export interface FilterState {
  search: string;
  category_id: string;
  scale_items_only: boolean;
  active_filter: 'all' | 'active' | 'inactive';
  sort_by: 'name_en' | 'sku' | 'created_at' | 'price_retail';
  sort_order: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StatsCounts {
  total: number;
  active: number;
  inactive: number;
  scale_items: number;
}

export interface UseProductsQueryResult {
  // Data
  products: ProductWithRelations[];
  categories: Category[];
  suppliers: Supplier[];
  stats: StatsCounts;
  pagination: PaginationMeta;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  refetch: () => Promise<void>;
  updateFilters: (filters: Partial<FilterState>) => void;
  updatePagination: (pagination: Partial<PaginationMeta>) => void;
  updateProduct: (id: number, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number, hard?: boolean) => Promise<void>;
  toggleActive: (id: number) => Promise<void>;
  
  // Computed
  hasFilters: boolean;
  isEmpty: boolean;
}

export function useProductsQuery(
  initialFilters: FilterState,
  initialPagination: PaginationMeta
): UseProductsQueryResult {
  // State
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [pagination, setPagination] = useState<PaginationMeta>(initialPagination);
  const [stats, setStats] = useState<StatsCounts>({ total: 0, active: 0, inactive: 0, scale_items: 0 });

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [productsResult, categoriesData, suppliersData] = await Promise.all([
        dataService.getProducts({
          search: filters.search,
          category_id: filters.category_id,
          scale_items_only: filters.scale_items_only,
          active_filter: filters.active_filter,
          sortBy: filters.sort_by,
          sortOrder: filters.sort_order,
          page: pagination.page,
          pageSize: pagination.pageSize
        }),
        dataService.getCategories(),
        dataService.getSuppliers()
      ]);

      const productsData = Array.isArray(productsResult) ? productsResult : [];
      const meta = {}; // No meta data available from direct array response

      // Enrich products with related data
      const enrichedProducts = productsData.map((product: Product) => ({
        ...product,
        category: Array.isArray(categoriesData) ? categoriesData.find((c: Category) => c.id === product.category_id) : undefined,
        preferred_supplier: Array.isArray(suppliersData) ? suppliersData.find((s: Supplier) => s.id === product.preferred_supplier_id) : undefined
      }));

      setProducts(enrichedProducts);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);

      // Update pagination
      setPagination(prev => ({
        ...prev,
        total: productsData.length,
        totalPages: 1, // No pagination info available
        hasNextPage: false,
        hasPrevPage: false
      }));

      // Calculate stats
      const stats: StatsCounts = {
        total: productsData.length,
        active: productsData.filter((p: Product) => p.is_active).length,
        inactive: productsData.filter((p: Product) => !p.is_active).length,
        scale_items: productsData.filter((p: Product) => p.is_scale_item).length
      };
      setStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load products';
      setError(errorMessage);
      console.error('Failed to load products:', err);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const refetch = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  const updatePagination = useCallback((newPagination: Partial<PaginationMeta>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  const updateProduct = useCallback(async (id: number, updates: Partial<Product>) => {
    try {
      await dataService.updateProduct(id, updates);
      toast.success('Product updated successfully');
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update product';
      console.error('Failed to update product:', err);
      toast.error(errorMessage);
      throw err;
    }
  }, [refetch]);

  const deleteProduct = useCallback(async (id: number, hard = false) => {
    try {
      const result = await dataService.deleteProduct(id);
      
      if (hard) {
        toast.success('Product permanently deleted');
      } else {
        toast.success('Product deactivated successfully');
      }
      
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product';
      console.error('Failed to delete product:', err);
      toast.error(errorMessage);
      throw err;
    }
  }, [refetch]);

  const toggleActive = useCallback(async (id: number) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) {
        throw new Error('Product not found');
      }

      await dataService.updateProduct(id, { is_active: !product.is_active });
      toast.success(`Product ${!product.is_active ? 'activated' : 'deactivated'} successfully`);
      await refetch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to toggle product status';
      console.error('Failed to toggle product status:', err);
      toast.error(errorMessage);
      throw err;
    }
  }, [products, refetch]);

  // Computed values
  const hasFilters = useMemo(() => {
    return !!(
      filters.search ||
      filters.category_id ||
      filters.scale_items_only ||
      filters.active_filter !== 'all'
    );
  }, [filters]);

  const isEmpty = useMemo(() => {
    return !loading && products.length === 0;
  }, [loading, products.length]);

  return {
    // Data
    products,
    categories,
    suppliers,
    stats,
    pagination,
    
    // State
    loading,
    error,
    
    // Actions
    refetch,
    updateFilters,
    updatePagination,
    updateProduct,
    deleteProduct,
    toggleActive,
    
    // Computed
    hasFilters,
    isEmpty
  };
}

// Utility hook for debounced search
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Utility hook for URL synchronization
export function useURLSync(
  filters: FilterState,
  pagination: PaginationMeta,
  updateURL: (updates: Record<string, any>) => void
) {
  useEffect(() => {
    updateURL({
      search: filters.search,
      category_id: filters.category_id,
      scale_items_only: filters.scale_items_only,
      active_filter: filters.active_filter,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      page: pagination.page,
      pageSize: pagination.pageSize
    });
  }, [filters, pagination, updateURL]);
}

