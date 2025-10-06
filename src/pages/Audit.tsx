/**
 * Audit Page
 * View and export audit logs with comprehensive filtering
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  User,
  Activity,
  Eye,
  AlertTriangle,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { 
  auditService, 
  AuditLog, 
  AuditFilters,
  AUDIT_ACTIONS 
} from '@/services/auditService';
import { csvService } from '@/services/csvService';
import { authService } from '@/services/authService';
import { useAppStore } from '@/store/appStore';
import RequirePerm from '@/components/Security/RequirePerm';

const Audit: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({
    totalEvents: 0,
    uniqueUsers: 0,
    topActions: [] as Array<{ action: string; count: number }>,
    recentFailures: 0
  });
  
  const [filters, setFilters] = useState<AuditFilters>({
    limit: 50,
    offset: 0
  });

  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    if (!authService.hasPermission('AUDIT_VIEW')) {
      navigate('/');
      toast.error('Access denied: Audit viewing requires manager permissions');
      return;
    }
  }, [currentUser, navigate]);

  // Load audit data
  const loadData = useCallback(async (newPage = 1) => {
    setLoading(true);
    try {
      const offset = (newPage - 1) * (filters.limit || 50);
      const searchFilters = { ...filters, offset };
      
      const [auditData, auditStats] = await Promise.all([
        auditService.list(searchFilters),
        auditService.getStats()
      ]);
      
      setLogs(auditData.logs);
      setTotal(auditData.total);
      setHasMore(auditData.hasMore);
      setStats(auditStats);
      setPage(newPage);
      
      // Log audit access
      await auditService.log({
        action: AUDIT_ACTIONS.AUDIT_VIEW,
        payload: { filters: searchFilters, results_count: auditData.logs.length }
      });
      
    } catch (error) {
      console.error('Failed to load audit data:', error);
      toast.error('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadData(1);
  }, [loadData]);

  // Export audit logs
  const handleExport = async () => {
    if (!authService.hasPermission('AUDIT_EXPORT')) {
      toast.error('Access denied: Audit export requires admin permissions');
      return;
    }

    setExporting(true);
    try {
      // Get all logs for export (no pagination)
      const exportFilters = { ...filters, limit: undefined, offset: undefined };
      const { logs: allLogs } = await auditService.list(exportFilters);
      
      await csvService.exportAuditCSV(allLogs);
      
      // Log export action
      await auditService.log({
        action: AUDIT_ACTIONS.AUDIT_EXPORT,
        payload: { 
          filters: exportFilters, 
          exported_count: allLogs.length 
        }
      });
      
      toast.success(`Exported ${allLogs.length} audit records`);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      toast.error('Failed to export audit logs');
    } finally {
      setExporting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Get action color
  const getActionColor = (action: string) => {
    if (action.includes('FAIL') || action.includes('LOCKOUT') || action.includes('DENIED')) {
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
    }
    if (action.includes('SUCCESS') || action.includes('COMPLETE')) {
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
    }
    if (action.includes('OVERRIDE') || action.includes('ESCALATION')) {
      return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20';
    }
    return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    if (action.includes('FAIL') || action.includes('DENIED')) {
      return <AlertTriangle className="w-3 h-3" />;
    }
    if (action.includes('OVERRIDE') || action.includes('ESCALATION')) {
      return <Shield className="w-3 h-3" />;
    }
    return <Activity className="w-3 h-3" />;
  };

  const pageSize = filters.limit || 50;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <RequirePerm permission="AUDIT_VIEW">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Audit Trail
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Security events and system activity logs
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    showFilters 
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
                
                <button
                  onClick={handleExport}
                  disabled={exporting || !authService.hasPermission('AUDIT_EXPORT')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  title={!authService.hasPermission('AUDIT_EXPORT') ? 'Requires admin permission' : ''}
                >
                  <Download className="h-4 w-4" />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
                
                <button
                  onClick={() => loadData(page)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Events (7d)</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEvents}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <User className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.uniqueUsers}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Recent Failures</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recentFailures}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Showing</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{logs.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Action
                  </label>
                  <select
                    value={filters.action || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">All Actions</option>
                    {Object.values(AUDIT_ACTIONS).map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Entity
                  </label>
                  <input
                    type="text"
                    placeholder="sale, user, etc."
                    value={filters.entity || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, entity: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="User, action, etc."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Audit Logs ({total.toLocaleString()})
                </h3>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadData(page - 1)}
                      disabled={page <= 1 || loading}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {page} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => loadData(page + 1)}
                      disabled={page >= totalPages || loading}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading audit logs...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <Activity className="h-8 w-8 mb-2" />
                <p>No audit logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Timestamp</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">User</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Action</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Entity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Terminal</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {formatDate(log.at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {log.user_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            getActionColor(log.action)
                          )}>
                            {getActionIcon(log.action)}
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {log.entity && (
                            <span>
                              {log.entity}
                              {log.entity_id && `:${log.entity_id}`}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {log.terminal}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {log.payload_json && (
                            <details className="cursor-pointer">
                              <summary className="text-blue-600 hover:text-blue-700">
                                View payload
                              </summary>
                              <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                                {JSON.stringify(JSON.parse(log.payload_json), null, 2)}
                              </pre>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </RequirePerm>
  );
};

export default Audit;







