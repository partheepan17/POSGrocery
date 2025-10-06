import React from 'react';
import { ArrowLeft, DollarSign, Edit, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PriceManagementPage() {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Price Management</h1>
          </div>
        </div>

        {/* Price Tiers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Price Tiers
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Retail</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Default tier</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Wholesale</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Bulk pricing</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Credit</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Credit accounts</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-white">Other</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Custom pricing</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Price Rules
            </h2>
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">Wholesale Discount</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">10% off retail</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Applied when price tier is set to Wholesale
                </div>
              </div>
              <div className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">Credit Markup</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">5% above retail</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Applied when price tier is set to Credit
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Price Update */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Bulk Price Update
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Category
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>All Categories</option>
                <option>Groceries</option>
                <option>Dairy</option>
                <option>Bakery</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price Tier
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Retail</option>
                <option>Wholesale</option>
                <option>Credit</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Update Type
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Percentage Increase</option>
                <option>Percentage Decrease</option>
                <option>Fixed Amount</option>
                <option>Set to Amount</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <input
              type="number"
              placeholder="Enter value"
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
              <Save className="w-4 h-4" />
              <span>Apply Update</span>
            </button>
          </div>
        </div>

        {/* Price History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Price Changes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Tier</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Old Price</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">New Price</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Changed By</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">2025-01-05 14:30</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Rice 1kg</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Retail</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">රු 115.00</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">රු 120.00</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Admin User</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
