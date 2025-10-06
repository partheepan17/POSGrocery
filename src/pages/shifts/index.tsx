import React from 'react';
import { ArrowLeft, Clock, FileText, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ShiftsPage() {
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shift Management</h1>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Shift */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Shift
            </h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Started</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date().toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Status</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-gray-500 rounded"></div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Operator</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Admin User</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                End Shift
              </button>
              <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                X Report
              </button>
            </div>
          </div>

          {/* Shift Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Shift Reports
            </h2>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">X Report</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Current shift summary</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-green-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-white">Z Report</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">End of day summary</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent Shifts */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Shifts
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Operator</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Start Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">End Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Total Sales</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4 text-gray-900 dark:text-white">2025-01-05</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">Admin User</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">09:00:00</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">17:00:00</td>
                  <td className="py-3 px-4 text-gray-900 dark:text-white">රු 25,450.00</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm">
                      Completed
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
