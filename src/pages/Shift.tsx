/**
 * Shift Management Page
 * Handles session tracking, cash operations, and shift reports
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Clock, 
  DollarSign, 
  FileText, 
  History, 
  Plus, 
  Minus,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calculator,
  Lock,
  Unlock,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { authService } from '@/services/authService';
import { shiftService, Session, XReport, ZReport, CashEvent, SessionFilters } from '@/services/shiftService';
import { csvService } from '@/services/csvService';
import { shiftPrintAdapter } from '@/services/print/ShiftPrintAdapter';
import { useAppStore } from '@/store/appStore';

type TabType = 'session' | 'cash' | 'xreport' | 'zreport' | 'history';

interface ShiftState {
  activeTab: TabType;
  loading: boolean;
  sessionSummary: any | null;
  xReport: XReport | null;
  zReport: ZReport | null;
  sessions: Session[];
  cashEvents: CashEvent[];
  
  // Cash operations
  cashAmount: string;
  cashReason: string;
  showCashDialog: boolean;
  cashType: 'IN' | 'OUT';
  
  // Session start
  showStartDialog: boolean;
  openingFloat: string;
  
  // Z Report
  showZDialog: boolean;
  countedCash: string;
  managerPin: string;
  
  // History filters
  filters: SessionFilters;
}

const Shift: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, currentSession, terminal, setCurrentSession } = useAppStore();
  
  const [state, setState] = useState<ShiftState>({
    activeTab: 'session',
    loading: false,
    sessionSummary: null,
    xReport: null,
    zReport: null,
    sessions: [],
    cashEvents: [],
    cashAmount: '',
    cashReason: '',
    showCashDialog: false,
    cashType: 'IN',
    showStartDialog: false,
    openingFloat: '0',
    showZDialog: false,
    countedCash: '',
    managerPin: '',
    filters: {}
  });

  // Check for action parameter
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'start' && !currentSession) {
      setState(prev => ({ ...prev, showStartDialog: true }));
    }
  }, [searchParams, currentSession]);

  // Load session data
  const loadSessionData = useCallback(async () => {
    if (!currentSession) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const summary = await shiftService.getSessionSummary(currentSession.id);
      setState(prev => ({ 
        ...prev, 
        sessionSummary: summary,
        cashEvents: summary.cashEvents,
        loading: false 
      }));
    } catch (error) {
      console.error('Failed to load session data:', error);
      toast.error('Failed to load session data');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [currentSession]);

  // Load sessions for history
  const loadSessions = useCallback(async () => {
    try {
      const sessions = await shiftService.listSessions(state.filters);
      setState(prev => ({ ...prev, sessions }));
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Failed to load session history');
    }
  }, [state.filters]);

  // Start new session
  const handleStartSession = useCallback(async () => {
    if (!currentUser) return;
    
    const openingAmount = parseFloat(state.openingFloat) || 0;
    
    try {
      const session = await shiftService.startSession(currentUser.id, terminal, openingAmount);
      setCurrentSession(session);
      setState(prev => ({ 
        ...prev, 
        showStartDialog: false,
        openingFloat: '0'
      }));
      
      toast.success('Shift started successfully');
      navigate('/sales');
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Failed to start shift');
    }
  }, [currentUser, terminal, state.openingFloat, setCurrentSession, navigate]);

  // Record cash event
  const handleCashEvent = useCallback(async () => {
    if (!currentSession) return;
    
    const amount = parseFloat(state.cashAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (!state.cashReason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    
    try {
      await shiftService.recordCashEvent(
        currentSession.id,
        state.cashType,
        amount,
        state.cashReason.trim()
      );
      
      setState(prev => ({ 
        ...prev, 
        showCashDialog: false,
        cashAmount: '',
        cashReason: ''
      }));
      
      toast.success(`Cash ${state.cashType.toLowerCase()} recorded successfully`);
      await loadSessionData();
    } catch (error) {
      console.error('Failed to record cash event:', error);
      toast.error('Failed to record cash event');
    }
  }, [currentSession, state.cashAmount, state.cashReason, state.cashType, loadSessionData]);

  // Generate X Report
  const handleXReport = useCallback(async () => {
    if (!currentSession) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const xReport = await shiftService.getXReport(currentSession.id);
      setState(prev => ({ 
        ...prev, 
        xReport,
        activeTab: 'xreport',
        loading: false 
      }));
      
      toast.success('X Report generated');
    } catch (error) {
      console.error('Failed to generate X Report:', error);
      toast.error('Failed to generate X Report');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [currentSession]);

  // Handle Z Report close
  const handleZReport = useCallback(async () => {
    if (!currentSession) return;
    
    const counted = parseFloat(state.countedCash);
    if (isNaN(counted)) {
      toast.error('Please enter counted cash amount');
      return;
    }
    
    // Verify manager PIN
    try {
      const verification = await authService.verifyPin(state.managerPin, 'MANAGER');
      if (!verification.success) {
        toast.error('Manager authorization required');
        return;
      }
      
      const zReport = await shiftService.endSession(
        currentSession.id,
        counted,
        'Shift closed by manager',
        verification.user?.id
      );
      
      setState(prev => ({ 
        ...prev, 
        zReport,
        activeTab: 'zreport',
        showZDialog: false,
        countedCash: '',
        managerPin: ''
      }));
      
      setCurrentSession(null);
      toast.success('Shift closed successfully');
      
    } catch (error) {
      console.error('Failed to close shift:', error);
      toast.error('Failed to close shift');
    }
  }, [currentSession, state.countedCash, state.managerPin, setCurrentSession]);

  // Export functions
  const exportXReport = useCallback(async () => {
    if (!state.xReport) return;
    try {
      await csvService.exportXReportCSV(state.xReport);
      toast.success('X Report exported');
    } catch (error) {
      toast.error('Export failed');
    }
  }, [state.xReport]);

  const exportZReport = useCallback(async () => {
    if (!state.zReport) return;
    try {
      await csvService.exportZReportCSV(state.zReport);
      toast.success('Z Report exported');
    } catch (error) {
      toast.error('Export failed');
    }
  }, [state.zReport]);

  const exportHistory = useCallback(async () => {
    try {
      await csvService.exportShiftHistoryCSV(state.sessions);
      toast.success('History exported');
    } catch (error) {
      toast.error('Export failed');
    }
  }, [state.sessions]);

  // Print functions
  const printXReport = useCallback(async () => {
    if (!state.xReport) return;
    try {
      await shiftPrintAdapter.printXReport(state.xReport);
      toast.success('X Report printed');
    } catch (error) {
      toast.error('Print failed');
    }
  }, [state.xReport]);

  const printZReport = useCallback(async () => {
    if (!state.zReport) return;
    try {
      await shiftPrintAdapter.printZReport(state.zReport);
      toast.success('Z Report printed');
    } catch (error) {
      toast.error('Print failed');
    }
  }, [state.zReport]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        setState(prev => ({ 
          ...prev, 
          showCashDialog: true, 
          cashType: 'IN' 
        }));
      }
      
      if (event.ctrlKey && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        setState(prev => ({ 
          ...prev, 
          showCashDialog: true, 
          cashType: 'OUT' 
        }));
      }
      
      if (event.key === 'F10') {
        event.preventDefault();
        handleXReport();
      }
      
      if (event.key === 'F11') {
        event.preventDefault();
        setState(prev => ({ ...prev, showZDialog: true }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleXReport]);

  // Load data on mount and tab change
  useEffect(() => {
    if (state.activeTab === 'session' && currentSession) {
      loadSessionData();
    } else if (state.activeTab === 'history') {
      loadSessions();
    }
  }, [state.activeTab, currentSession, loadSessionData, loadSessions]);

  // Redirect if not authenticated
  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const tabs = [
    { id: 'session' as TabType, label: 'Session', icon: Clock, disabled: !currentSession },
    { id: 'cash' as TabType, label: 'Cash In/Out', icon: DollarSign, disabled: !currentSession },
    { id: 'xreport' as TabType, label: 'X Report', icon: FileText, disabled: !currentSession },
    { id: 'zreport' as TabType, label: 'Z Report', icon: Lock },
    { id: 'history' as TabType, label: 'History', icon: History }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Shift Management
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>Cashier: <strong>{currentUser.name}</strong></span>
                <span>Terminal: <strong>{terminal}</strong></span>
                {currentSession && (
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Session Active
                  </span>
                )}
              </div>
            </div>
            
            {!currentSession && (
              <button
                onClick={() => setState(prev => ({ ...prev, showStartDialog: true }))}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Start Shift
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setState(prev => ({ ...prev, activeTab: tab.id }))}
                    disabled={tab.disabled}
                    className={cn(
                      "flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap",
                      state.activeTab === tab.id
                        ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                      tab.disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Session Tab */}
            {state.activeTab === 'session' && currentSession && state.sessionSummary && (
              <div className="space-y-6">
                {/* Session Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-blue-900 dark:text-blue-100">Session Duration</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {Math.floor((new Date().getTime() - new Date(currentSession.started_at).getTime()) / (1000 * 60 * 60))}h {Math.floor(((new Date().getTime() - new Date(currentSession.started_at).getTime()) % (1000 * 60 * 60)) / (1000 * 60))}m
                    </p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-900 dark:text-green-100">Total Sales</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {shiftService.formatCurrency(state.sessionSummary.totals.net)}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-purple-900 dark:text-purple-100">Expected Cash</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {shiftService.formatCurrency(state.sessionSummary.totals.expected_cash)}
                    </p>
                  </div>
                </div>

                {/* Sales Summary */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{state.sessionSummary.totals.invoices}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Invoices</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.sessionSummary.totals.gross)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Gross</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.sessionSummary.totals.discount)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Discounts</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.sessionSummary.totals.tax)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tax</p>
                    </div>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Methods</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Cash</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.sessionSummary.totals.cash)}</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Card</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.sessionSummary.totals.card)}</span>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Wallet</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.sessionSummary.totals.wallet)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cash In/Out Tab */}
            {state.activeTab === 'cash' && currentSession && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setState(prev => ({ ...prev, showCashDialog: true, cashType: 'IN' }))}
                    className="flex items-center gap-3 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  >
                    <Plus className="h-8 w-8 text-green-600 dark:text-green-400" />
                    <div className="text-left">
                      <h3 className="font-semibold text-green-900 dark:text-green-100">Cash In</h3>
                      <p className="text-sm text-green-700 dark:text-green-300">Add cash to drawer (Ctrl+I)</p>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setState(prev => ({ ...prev, showCashDialog: true, cashType: 'OUT' }))}
                    className="flex items-center gap-3 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Minus className="h-8 w-8 text-red-600 dark:text-red-400" />
                    <div className="text-left">
                      <h3 className="font-semibold text-red-900 dark:text-red-100">Cash Out</h3>
                      <p className="text-sm text-red-700 dark:text-red-300">Remove cash from drawer (Ctrl+O)</p>
                    </div>
                  </button>
                </div>

                {/* Cash Events History */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Cash Events</h3>
                  </div>
                  
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {state.cashEvents.length === 0 ? (
                      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                        No cash events recorded
                      </div>
                    ) : (
                      state.cashEvents.map((event) => (
                        <div key={event.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center",
                              event.type === 'IN' 
                                ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                                : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                            )}>
                              {event.type === 'IN' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{event.reason}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(event.created_at).toLocaleString()} • {event.created_by_name}
                              </p>
                            </div>
                          </div>
                          <span className={cn(
                            "font-semibold",
                            event.type === 'IN' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {event.type === 'IN' ? '+' : '-'}{shiftService.formatCurrency(event.amount)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* X Report Tab */}
            {state.activeTab === 'xreport' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">X Report (Mid-Shift)</h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleXReport}
                      disabled={!currentSession || state.loading}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={cn("h-4 w-4", state.loading && "animate-spin")} />
                      Generate (F10)
                    </button>
                    {state.xReport && (
                      <>
                        <button
                          onClick={printXReport}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </button>
                        <button
                          onClick={exportXReport}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Export CSV
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {state.xReport && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{state.xReport.totals.invoices}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Invoices</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.xReport.totals.net)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Net Sales</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.xReport.totals.cash)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Cash</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.xReport.totals.expected_cash)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Expected Cash</p>
                      </div>
                    </div>
                    
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      Generated: {new Date(state.xReport.generated_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Z Report Tab */}
            {state.activeTab === 'zreport' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Z Report (End of Shift)</h2>
                  <div className="flex gap-3">
                    {currentSession ? (
                      <button
                        onClick={() => setState(prev => ({ ...prev, showZDialog: true }))}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <Lock className="h-4 w-4" />
                        Close Shift (F11)
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <Unlock className="h-4 w-4" />
                        No active session
                      </div>
                    )}
                    
                    {state.zReport && (
                      <>
                        <button
                          onClick={printZReport}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </button>
                        <button
                          onClick={exportZReport}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Export CSV
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {state.zReport && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{state.zReport.totals.invoices}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Invoices</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.zReport.totals.net)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Net Sales</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.zReport.totals.expected_cash)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Expected</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{shiftService.formatCurrency(state.zReport.counted_cash)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Counted</p>
                      </div>
                      <div className="text-center">
                        <p className={cn(
                          "text-2xl font-bold",
                          shiftService.getVarianceColor(state.zReport.variance) === 'green' && "text-green-600 dark:text-green-400",
                          shiftService.getVarianceColor(state.zReport.variance) === 'amber' && "text-amber-600 dark:text-amber-400",
                          shiftService.getVarianceColor(state.zReport.variance) === 'red' && "text-red-600 dark:text-red-400"
                        )}>
                          {shiftService.formatCurrency(state.zReport.variance)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Variance</p>
                      </div>
                    </div>
                    
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                      Closed: {new Date(state.zReport.ended_at).toLocaleString()} • {state.zReport.closed_by_name}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {state.activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Session History</h2>
                  <button
                    onClick={exportHistory}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Session</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Cashier</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Started</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Ended</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                        {state.sessions.map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">#{session.id}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{session.cashier_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {new Date(session.started_at).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {session.ended_at ? new Date(session.ended_at).toLocaleString() : '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full",
                                session.status === 'OPEN' 
                                  ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              )}>
                                {session.status === 'OPEN' ? (
                                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                                {session.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Start Session Dialog */}
      {state.showStartDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Start New Shift</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Opening Float
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={state.openingFloat}
                  onChange={(e) => setState(prev => ({ ...prev, openingFloat: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setState(prev => ({ ...prev, showStartDialog: false }))}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSession}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Start Shift
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Dialog */}
      {state.showCashDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Cash {state.cashType === 'IN' ? 'In' : 'Out'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={state.cashAmount}
                  onChange={(e) => setState(prev => ({ ...prev, cashAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <select
                  value={state.cashReason}
                  onChange={(e) => setState(prev => ({ ...prev, cashReason: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select reason...</option>
                  {shiftService.getCashEventReasons()[state.cashType.toLowerCase() as 'in' | 'out'].map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setState(prev => ({ ...prev, showCashDialog: false }))}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCashEvent}
                className={cn(
                  "flex-1 px-4 py-2 text-white rounded-lg transition-colors",
                  state.cashType === 'IN' 
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                )}
              >
                Record Cash {state.cashType === 'IN' ? 'In' : 'Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Z Report Dialog */}
      {state.showZDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Close Shift - Manager Authorization Required
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Counted Cash Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={state.countedCash}
                  onChange={(e) => setState(prev => ({ ...prev, countedCash: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Manager PIN
                </label>
                <input
                  type="password"
                  value={state.managerPin}
                  onChange={(e) => setState(prev => ({ ...prev, managerPin: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter manager PIN"
                />
              </div>
              
              {currentSession && state.sessionSummary && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Expected Cash: <strong>{shiftService.formatCurrency(state.sessionSummary.totals.expected_cash)}</strong>
                  </p>
                  {state.countedCash && (
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                      Variance: <strong>{shiftService.formatCurrency(parseFloat(state.countedCash) - state.sessionSummary.totals.expected_cash)}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setState(prev => ({ ...prev, showZDialog: false }))}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleZReport}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Close Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shift;


