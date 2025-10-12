import React from 'react';
import { ArrowLeft, Search, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function InventoryPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/pos');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stock Levels</h1>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>All Categories</option>
              <option>Groceries</option>
              <option>Dairy</option>
              <option>Bakery</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>All Stock Levels</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
              <option>In Stock</option>
            </select>
          </div>
        </div>

        {/* Stock Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">156</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Stock</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">142</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">8</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">6</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Stock Levels Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">SKU</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Current Stock</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Min Level</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Max Level</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Rice 1kg</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">PROD001</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Groceries</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">100 kg</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">20 kg</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">200 kg</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                      In Stock
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">2025-01-05 14:30</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Sugar 1kg</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">PROD002</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Groceries</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">15 kg</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">20 kg</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">100 kg</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm">
                      Low Stock
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">2025-01-05 12:15</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Milk 1L</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">PROD003</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Dairy</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">0 L</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">10 L</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">50 L</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-sm">
                      Out of Stock
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">2025-01-05 10:45</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Bread</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">PROD004</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Bakery</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">25 pc</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">10 pc</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">50 pc</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                      In Stock
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">2025-01-05 16:20</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
