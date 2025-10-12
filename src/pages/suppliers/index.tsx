import React from 'react';
import { ArrowLeft, Plus, Search, Edit, Trash2, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SuppliersPage() {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
            </div>
            <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Suppliers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">ABC Foods Ltd</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Primary Supplier</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Contact:</span> John Smith
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Phone:</span> +94 11 234 5678
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Email:</span> john@abcfoods.lk
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Products:</span> 45 items
              </div>
            </div>
            <div className="mt-4">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                Active
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Fresh Dairy Co</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Dairy Products</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Contact:</span> Sarah Johnson
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Phone:</span> +94 11 345 6789
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Email:</span> sarah@freshdairy.lk
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Products:</span> 23 items
              </div>
            </div>
            <div className="mt-4">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                Active
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Bakery Supplies</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bakery Items</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Contact:</span> Mike Wilson
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Phone:</span> +94 11 456 7890
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Email:</span> mike@bakerysupplies.lk
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Products:</span> 18 items
              </div>
            </div>
            <div className="mt-4">
              <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-sm">
                Pending
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
