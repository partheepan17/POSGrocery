import React, { useState } from 'react';
import { Search as SearchIcon, Package, Users, DollarSign } from 'lucide-react';

export default function Search() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Mock search results
    const mockResults = [
      { type: 'product', name: 'Sample Product 1', id: 1, icon: Package },
      { type: 'customer', name: 'John Doe', id: 2, icon: Users },
      { type: 'supplier', name: 'ABC Suppliers', id: 3, icon: DollarSign },
    ];
    setSearchResults(mockResults.filter(item => 
      item.name.toLowerCase().includes(term.toLowerCase())
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Search</h1>
        
        {/* Search Input */}
        <div className="relative mb-8">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products, customers, suppliers..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Search Results</h2>
            {searchResults.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <result.icon className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{result.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{result.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchTerm && searchResults.length === 0 && (
          <div className="text-center py-8">
            <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No results found for "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
}


