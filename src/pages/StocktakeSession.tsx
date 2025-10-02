/**
 * Stocktake Session Page
 * Individual stocktake counting workspace
 */

import React from 'react';
import { useParams } from 'react-router-dom';

const StocktakeSession: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Stocktake Session {id}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This page is under development. Individual stocktake counting workspace will be implemented here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StocktakeSession;


