/**
 * Feature DevTools
 * Development tools for inspecting feature state
 */

import React, { useState, useEffect } from 'react';
import { useFeatures } from './useFeatures';

interface FeatureDevToolsProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  collapsed?: boolean;
  showOnHover?: boolean;
}

export const FeatureDevTools: React.FC<FeatureDevToolsProps> = ({
  position = 'bottom-right',
  collapsed = true,
  showOnHover = false
}) => {
  const [isOpen, setIsOpen] = useState(!collapsed);
  const [hovered, setHovered] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [showPermissions, setShowPermissions] = useState(true);
  const [showFeatures, setShowFeatures] = useState(true);

  const {
    features,
    loading,
    error,
    connected,
    refresh,
    getSummary,
    featureCategories,
    permissionCategories
  } = useFeatures();

  // Show on hover
  useEffect(() => {
    if (showOnHover && hovered) {
      setIsOpen(true);
    } else if (showOnHover && !hovered) {
      setIsOpen(false);
    }
  }, [hovered, showOnHover]);

  // Don't render in production
  if ((globalThis as any).process?.env?.NODE_ENV === 'production') {
    return null;
  }

  const summary = getSummary();
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const filteredFeatures = features ? Object.entries(features.enabled)
    .filter(([code, enabled]) => {
      const matchesSearch = code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || 
        (filterType === 'enabled' && enabled) || 
        (filterType === 'disabled' && !enabled);
      return matchesSearch && matchesFilter;
    })
    .sort(([a], [b]) => a.localeCompare(b)) : [];

  const filteredPermissions = features ? Object.entries(features.permissions)
    .filter(([code, enabled]) => {
      const matchesSearch = code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'all' || 
        (filterType === 'enabled' && enabled) || 
        (filterType === 'disabled' && !enabled);
      return matchesSearch && matchesFilter;
    })
    .sort(([a], [b]) => a.localeCompare(b)) : [];

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 max-w-md`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        🎛️ Features
        {connected && <span className="ml-1 text-green-300">●</span>}
        {loading && <span className="ml-1 text-yellow-300">⟳</span>}
        {error && <span className="ml-1 text-red-300">⚠</span>}
      </button>

      {/* DevTools Panel */}
      {isOpen && (
        <div className="mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Feature DevTools</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={refresh}
                className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                disabled={loading}
              >
                {loading ? '⟳' : '↻'} Refresh
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs">
            <div className="flex items-center justify-between">
              <span>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</span>
              <span>Loading: {loading ? '🟡 Yes' : '🟢 No'}</span>
            </div>
            {error && (
              <div className="mt-1 text-red-600">
                Error: {error}
              </div>
            )}
          </div>

          {/* Summary */}
          {summary && (
            <div className="px-4 py-2 bg-blue-50 border-b border-gray-200 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>Features: {summary.enabledFeatures}/{summary.totalFeatures}</div>
                <div>Permissions: {summary.enabledPermissions}/{summary.totalPermissions}</div>
                <div>Role: {features?.user.role}</div>
                <div>Tenant: {features?.tenant}</div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="px-4 py-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search features/permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-gray-300 rounded"
            />
            <div className="mt-2 flex items-center space-x-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs px-2 py-1 border border-gray-300 rounded"
              >
                <option value="all">All</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
              <label className="text-xs flex items-center">
                <input
                  type="checkbox"
                  checked={showFeatures}
                  onChange={(e) => setShowFeatures(e.target.checked)}
                  className="mr-1"
                />
                Features
              </label>
              <label className="text-xs flex items-center">
                <input
                  type="checkbox"
                  checked={showPermissions}
                  onChange={(e) => setShowPermissions(e.target.checked)}
                  className="mr-1"
                />
                Permissions
              </label>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-48 overflow-y-auto">
            {/* Features */}
            {showFeatures && (
              <div className="px-4 py-2">
                <h4 className="font-semibold text-xs text-gray-700 mb-2">Features</h4>
                <div className="space-y-1">
                  {filteredFeatures.map(([code, enabled]) => (
                    <div
                      key={code}
                      className={`text-xs px-2 py-1 rounded flex items-center justify-between ${
                        enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      <span className="font-mono">{code}</span>
                      <span>{enabled ? '✓' : '✗'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Permissions */}
            {showPermissions && (
              <div className="px-4 py-2 border-t border-gray-200">
                <h4 className="font-semibold text-xs text-gray-700 mb-2">Permissions</h4>
                <div className="space-y-1">
                  {filteredPermissions.map(([code, enabled]) => (
                    <div
                      key={code}
                      className={`text-xs px-2 py-1 rounded flex items-center justify-between ${
                        enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      <span className="font-mono">{code}</span>
                      <span>{enabled ? '✓' : '✗'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Categories */}
          {(featureCategories.length > 0 || permissionCategories.length > 0) && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <h4 className="font-semibold text-xs text-gray-700 mb-2">Categories</h4>
              <div className="flex flex-wrap gap-1">
                {featureCategories.map(category => (
                  <span
                    key={category}
                    className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                  >
                    {category}
                  </span>
                ))}
                {permissionCategories.map(category => (
                  <span
                    key={category}
                    className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded"
                  >
                    {category}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FeatureDevTools;










