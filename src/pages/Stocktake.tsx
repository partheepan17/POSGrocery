/**
 * Stocktake Dashboard
 * Main page for managing stocktake sessions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Upload,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Package,
  CheckCircle,
  Clock,
  Eye,
  Copy,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { 
  stocktakeService, 
  StocktakeSession, 
  StocktakeFilters 
} from '@/services/stocktakeService';
import { csvService } from '@/services/csvService';
import { useAppStore } from '@/store/appStore';

const Stocktake: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  
  const [sessions, setSessions] = useState<StocktakeSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<{
    draftSessions: number;
    finalizedSessions: number;
    lastFinalizedDate?: string;
  }>({
    draftSessions: 0,
    finalizedSessions: 0,
    lastFinalizedDate: undefined
  });
  
  const [filters, setFilters] = useState<StocktakeFilters>({
    status: 'ALL'
  });

  // Authentication check
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
  }, [currentUser, navigate]);

  // Load sessions and stats
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsList, sessionStats] = await Promise.all([
        stocktakeService.listSessions(filters),
        stocktakeService.getSessionStats()
      ]);
      
      setSessions(sessionsList);
      setStats(sessionStats);
    } catch (error) {
      console.error('Failed to load stocktake data:', error);
      toast.error('Failed to load stocktake data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create new session
  const handleCreateSession = async () => {
    const name = prompt('Enter stocktake session name:');
    if (!name?.trim()) return;

    const note = prompt('Enter optional note:') || undefined;

    try {
      const session = await stocktakeService.createSession({
        name: name.trim(),
        note
      });

      toast.success(`Session "${session.name}" created`);
      navigate(`/stocktake/session/${session.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create session');
    }
  };

  // Import CSV to new session
  const handleImportToNewSession = async () => {
    const name = prompt('Enter name for new stocktake session:');
    if (!name?.trim()) return;

    try {
      const session = await stocktakeService.createSession({
        name: name.trim(),
        note: 'Created from CSV import'
      });

      toast.success(`Session "${session.name}" created`);
      navigate(`/stocktake/session/${session.id}?import=true`);
    } catch (error) {
      console.error('Failed to create session for import:', error);
      toast.error('Failed to create session');
    }
  };

  // Export session
  const handleExportSession = async (session: StocktakeSession) => {
    try {
      const counts = await stocktakeService.getSessionCounts(session.id);
      await csvService.exportStocktakeCountsCSV(session, counts);
      toast.success('Session exported to CSV');
    } catch (error) {
      console.error('Failed to export session:', error);
      toast.error('Failed to export session');
    }
  };

  // Duplicate session
  const handleDuplicateSession = async (session: StocktakeSession) => {
    const name = prompt('Enter name for duplicated session:', `${session.name} (Copy)`);
    if (!name?.trim()) return;

    try {
      const newSession = await stocktakeService.createSession({
        name: name.trim(),
        note: `Duplicated from: ${session.name}`
      });

      // Copy counts from original session
      const originalCounts = await stocktakeService.getSessionCounts(session.id);
      
      for (const count of originalCounts) {
        await stocktakeService.addCountLine(newSession.id, {
          productId: count.product_id,
          qty: count.qty,
          source: 'manual'
        });
      }

      toast.success(`Session duplicated as "${newSession.name}"`);
      loadData();
    } catch (error) {
      console.error('Failed to duplicate session:', error);
      toast.error('Failed to duplicate session');
    }
  };

  // Delete session
  const handleDeleteSession = async (session: StocktakeSession) => {
    if (session.status === 'FINALIZED') {
      toast.error('Cannot delete finalized session');
      return;
    }

    if (!confirm(`Delete stocktake session "${session.name}"?`)) {
      return;
    }

    try {
      await stocktakeService.deleteSession(session.id);
      toast.success('Session deleted');
      loadData();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
    }
  };

  // Open session
  const handleOpenSession = (session: StocktakeSession) => {
    navigate(`/stocktake/session/${session.id}`);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Stocktake Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Count inventory, identify variances, and post adjustments
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateSession}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Session
              </button>
              
              <button
                onClick={handleImportToNewSession}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </button>
              
              <button
                onClick={loadData}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Draft Sessions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draftSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Finalized Sessions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.finalizedSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Finalized</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.lastFinalizedDate 
                    ? formatDate(stats.lastFinalizedDate)
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sessions ({sessions.length})
            </h3>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors",
                showFilters 
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || 'ALL'}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="ALL">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="FINALIZED">Finalized</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Name or note..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Sessions List */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <Package className="h-8 w-8 mb-2" />
              <p>No stocktake sessions found</p>
              <button
                onClick={handleCreateSession}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                Create your first session
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Session</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Lines</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Variances</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Created By</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                  {sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{session.name}</p>
                          {session.note && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{session.note}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                          session.status === 'DRAFT'
                            ? "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400"
                            : "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                        )}>
                          {session.status === 'DRAFT' ? (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Draft
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Finalized
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(session.created_at)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {session.count_lines || 0}
                      </td>
                      <td className="px-4 py-3">
                        {session.variance_items ? (
                          <span className="inline-flex items-center text-sm text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {session.variance_items}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {session.by_user_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenSession(session)}
                            className="p-1 text-blue-600 hover:text-blue-700 transition-colors"
                            title="Open Session"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleExportSession(session)}
                            className="p-1 text-green-600 hover:text-green-700 transition-colors"
                            title="Export CSV"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          
                          {session.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleDuplicateSession(session)}
                                className="p-1 text-purple-600 hover:text-purple-700 transition-colors"
                                title="Duplicate"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => handleDeleteSession(session)}
                                className="p-1 text-red-600 hover:text-red-700 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
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
  );
};

export default Stocktake;
