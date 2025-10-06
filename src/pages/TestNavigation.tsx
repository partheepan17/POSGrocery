import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function TestNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  console.log('🧪 TestNavigation component loaded!', { pathname: location.pathname });

  const testNavigation = (path: string) => {
    console.log('🧪 Test navigation to:', path);
    navigate(path);
  };

  return (
    <div className="p-8 bg-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4 text-blue-600">🧪 Navigation Test Page</h1>
      <p className="text-sm text-gray-600 mb-6">Debug page for testing navigation functionality</p>
      
      <div className="mb-4">
        <p><strong>Current Location:</strong> {location.pathname}</p>
        <p><strong>Current Search:</strong> {location.search}</p>
        <p><strong>Current Hash:</strong> {location.hash}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Test Navigation Buttons:</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => testNavigation('/')}
            className="p-4 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Sales (/)
          </button>
          
          <button
            onClick={() => testNavigation('/products')}
            className="p-4 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Go to Products (/products)
          </button>
          
          <button
            onClick={() => testNavigation('/inventory')}
            className="p-4 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Go to Inventory (/inventory)
          </button>
          
          <button
            onClick={() => testNavigation('/audit')}
            className="p-4 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Go to Audit (/audit)
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">Test Keyboard Shortcuts:</h2>
          <p className="text-gray-600">Press these keys and check console:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Ctrl+1 → Should go to Sales</li>
            <li>Ctrl+2 → Should go to Products</li>
            <li>Ctrl+7 → Should go to Inventory</li>
            <li>Ctrl+A → Should go to Audit</li>
          </ul>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-semibold">Test Sidebar Navigation:</h2>
          <p className="text-gray-600">Click these items in the left sidebar:</p>
          <ul className="list-disc list-inside mt-2">
            <li>Sales</li>
            <li>Products</li>
            <li>Stock Levels (Inventory)</li>
            <li>Audit Trail</li>
          </ul>
        </div>

        <div className="mt-8 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <h3 className="font-semibold text-yellow-800">Debug Instructions:</h3>
          <ol className="list-decimal list-inside mt-2 text-yellow-700">
            <li>Open browser console (F12)</li>
            <li>Click the buttons above</li>
            <li>Try keyboard shortcuts</li>
            <li>Try sidebar navigation</li>
            <li>Report any console messages or errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
