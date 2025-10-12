import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product } from '@/services/dataService';
import { Category } from '@/services/dataService';

interface ProductWithCategory extends Product {
  category?: Category;
}

interface VirtualizedTableProps {
  products: ProductWithCategory[];
  selectedRows: Set<number>;
  editingCell: { productId: number; field: string; value: string } | null;
  onRowSelect: (productId: number, selected: boolean) => void;
  onSelectAll: () => void;
  onCellEdit: (productId: number, field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other') => void;
  onCellValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  isMissingPrice: (product: ProductWithCategory, field: keyof ProductWithCategory) => boolean;
  isPriceBlocked: (product: ProductWithCategory, field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other') => boolean;
  getPriceDisplay: (product: ProductWithCategory, field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other') => React.ReactNode;
  getValidationMessage: (product: ProductWithCategory, field: 'price_retail' | 'price_wholesale' | 'price_credit' | 'price_other') => string | null;
}

const ROW_HEIGHT = 60; // Height of each row in pixels
const HEADER_HEIGHT = 48; // Height of the header
const OVERSCAN = 5; // Number of rows to render outside visible area

export function VirtualizedTable({
  products,
  selectedRows,
  editingCell,
  onRowSelect,
  onSelectAll,
  onCellEdit,
  onCellValueChange,
  onSaveEdit,
  onCancelEdit,
  isMissingPrice,
  isPriceBlocked,
  getPriceDisplay,
  getValidationMessage
}: VirtualizedTableProps) {
  const [containerHeight, setContainerHeight] = useState(600);
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(
      products.length - 1,
      Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + OVERSCAN
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, products.length]);

  // Get visible products
  const visibleProducts = useMemo(() => {
    return products.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [products, visibleRange]);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight - HEADER_HEIGHT);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const totalHeight = products.length * ROW_HEIGHT;
  const offsetY = visibleRange.startIndex * ROW_HEIGHT;

  return (
    <div className="flex-1 overflow-hidden">
      <div className="bg-white">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center h-12 px-4">
            <input
              type="checkbox"
              checked={selectedRows.size === products.length && products.length > 0}
              onChange={onSelectAll}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1 grid grid-cols-8 gap-4 ml-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="sticky left-0 bg-gray-50 z-10">SKU</div>
              <div className="sticky left-16 bg-gray-50 z-10">Name (EN)</div>
              <div>Category</div>
              <div>Retail</div>
              <div>Wholesale</div>
              <div>Credit</div>
              <div>Other</div>
              <div>Updated</div>
            </div>
          </div>
        </div>

        {/* Virtualized Content */}
        <div
          ref={containerRef}
          className="overflow-auto"
          style={{ height: 'calc(100vh - 200px)' }}
          onScroll={handleScroll}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            <div
              style={{
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              {visibleProducts.map((product, index) => {
                const actualIndex = visibleRange.startIndex + index;
                return (
                  <div
                    key={product.id}
                    className="flex items-center h-15 px-4 border-b border-gray-100 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRows.has(product.id)}
                      onChange={(e) => onRowSelect(product.id, e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    
                    <div className="flex-1 grid grid-cols-8 gap-4 ml-4">
                      {/* SKU */}
                      <div className="text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                        {product.sku}
                      </div>
                      
                      {/* Name */}
                      <div className="text-sm text-gray-900 sticky left-16 bg-white z-10 max-w-xs truncate">
                        {product.name_en}
                      </div>
                      
                      {/* Category */}
                      <div className="text-sm text-gray-500">
                        {product.category?.name || '-'}
                      </div>
                      
                      {/* Retail Price */}
                      <div className="text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === 'price_retail' ? (
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => onCellValueChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onSaveEdit();
                              if (e.key === 'Escape') onCancelEdit();
                            }}
                            onBlur={onSaveEdit}
                            className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 ${
                              isPriceBlocked(product, 'price_retail') 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-blue-500'
                            }`}
                            autoFocus
                            title={getValidationMessage(product, 'price_retail') || ''}
                          />
                        ) : (
                          <button
                            onClick={() => onCellEdit(product.id, 'price_retail')}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                              isMissingPrice(product, 'price_retail') 
                                ? isPriceBlocked(product, 'price_retail')
                                  ? 'text-red-600 font-semibold'
                                  : 'text-red-600'
                                : 'text-gray-900'
                            }`}
                            title={getValidationMessage(product, 'price_retail') || ''}
                          >
                            {getPriceDisplay(product, 'price_retail')}
                          </button>
                        )}
                      </div>

                      {/* Wholesale Price */}
                      <div className="text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === 'price_wholesale' ? (
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => onCellValueChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onSaveEdit();
                              if (e.key === 'Escape') onCancelEdit();
                            }}
                            onBlur={onSaveEdit}
                            className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 ${
                              isPriceBlocked(product, 'price_wholesale') 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-blue-500'
                            }`}
                            autoFocus
                            title={getValidationMessage(product, 'price_wholesale') || ''}
                          />
                        ) : (
                          <button
                            onClick={() => onCellEdit(product.id, 'price_wholesale')}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                              isMissingPrice(product, 'price_wholesale') 
                                ? isPriceBlocked(product, 'price_wholesale')
                                  ? 'text-red-600 font-semibold'
                                  : 'text-orange-600'
                                : 'text-gray-900'
                            }`}
                            title={getValidationMessage(product, 'price_wholesale') || ''}
                          >
                            {getPriceDisplay(product, 'price_wholesale')}
                          </button>
                        )}
                      </div>

                      {/* Credit Price */}
                      <div className="text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === 'price_credit' ? (
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => onCellValueChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onSaveEdit();
                              if (e.key === 'Escape') onCancelEdit();
                            }}
                            onBlur={onSaveEdit}
                            className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 ${
                              isPriceBlocked(product, 'price_credit') 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-blue-500'
                            }`}
                            autoFocus
                            title={getValidationMessage(product, 'price_credit') || ''}
                          />
                        ) : (
                          <button
                            onClick={() => onCellEdit(product.id, 'price_credit')}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                              isMissingPrice(product, 'price_credit') 
                                ? isPriceBlocked(product, 'price_credit')
                                  ? 'text-red-600 font-semibold'
                                  : 'text-yellow-600'
                                : 'text-gray-900'
                            }`}
                            title={getValidationMessage(product, 'price_credit') || ''}
                          >
                            {getPriceDisplay(product, 'price_credit')}
                          </button>
                        )}
                      </div>

                      {/* Other Price */}
                      <div className="text-sm">
                        {editingCell?.productId === product.id && editingCell?.field === 'price_other' ? (
                          <input
                            type="text"
                            value={editingCell.value}
                            onChange={(e) => onCellValueChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') onSaveEdit();
                              if (e.key === 'Escape') onCancelEdit();
                            }}
                            onBlur={onSaveEdit}
                            className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 ${
                              isPriceBlocked(product, 'price_other') 
                                ? 'border-red-500 bg-red-50' 
                                : 'border-blue-500'
                            }`}
                            autoFocus
                            title={getValidationMessage(product, 'price_other') || ''}
                          />
                        ) : (
                          <button
                            onClick={() => onCellEdit(product.id, 'price_other')}
                            className={`w-full text-left px-2 py-1 rounded hover:bg-gray-100 ${
                              isMissingPrice(product, 'price_other') 
                                ? isPriceBlocked(product, 'price_other')
                                  ? 'text-red-600 font-semibold'
                                  : 'text-purple-600'
                                : 'text-gray-900'
                            }`}
                            title={getValidationMessage(product, 'price_other') || ''}
                          >
                            {getPriceDisplay(product, 'price_other')}
                          </button>
                        )}
                      </div>

                      {/* Last Updated */}
                      <div className="text-sm text-gray-500">
                        {product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '-'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer with stats */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-sm text-gray-600">
          Showing {visibleRange.startIndex + 1}-{Math.min(visibleRange.endIndex + 1, products.length)} of {products.length} products
          {visibleProducts.length < products.length && (
            <span className="ml-2 text-blue-600">
              (Virtualized for performance)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
