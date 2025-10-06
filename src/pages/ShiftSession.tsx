import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FormLabel, Textarea } from '../components/ui/Form';
import { Select, SelectOption } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import {
  ArrowLeft,
  Save,
  XCircle,
  CheckCircle,
  FileText,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  Calculator
} from 'lucide-react';
import { shiftService } from '../services/shiftService';
import { useSettingsStore } from '../store/settingsStore';
import { Shift, ShiftMovement, ShiftSummary, ShiftMovementType } from '../types';
import { useTranslation } from '../i18n';

export default function ShiftSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = useTranslation();
  const { settings } = useSettingsStore();
  
  const [shift, setShift] = useState<Shift | null>(null);
  const [movements, setMovements] = useState<ShiftMovement[]>([]);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Movement form
  const [movementType, setMovementType] = useState<ShiftMovementType>('CASH_IN');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  
  // Close shift form
  const [declaredCash, setDeclaredCash] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    if (id) {
      loadShiftData();
    }
  }, [id]);

  const loadShiftData = async () => {
    try {
      setLoading(true);
      const shiftData = await shiftService.getShift(parseInt(id!));
      setShift(shiftData.header);
      setMovements(shiftData.movements);
      
      const summaryData = await shiftService.getShiftSummary(parseInt(id!));
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMovement = async () => {
    if (!shift || !movementAmount || parseFloat(movementAmount) <= 0) {
      return;
    }

    try {
      setSaving(true);
      await shiftService.addMovement({
        shift_id: shift.id!,
        type: movementType,
        amount: parseFloat(movementAmount),
        reason: movementReason || null
      });
      
      // Reset form
      setMovementAmount('');
      setMovementReason('');
      
      // Reload data
      await loadShiftData();
    } catch (error) {
      console.error('Error adding movement:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseShift = async () => {
    if (!shift || !declaredCash || parseFloat(declaredCash) < 0) {
      return;
    }

    try {
      setSaving(true);
      await shiftService.closeShift(shift.id!, parseFloat(declaredCash), closeNote || undefined);
      
      // Reload data
      await loadShiftData();
      setShowCloseModal(false);
    } catch (error) {
      console.error('Error closing shift:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleVoidShift = async () => {
    if (!shift || !confirm('Are you sure you want to void this shift?')) {
      return;
    }

    try {
      setSaving(true);
      await shiftService.voidShift(shift.id!, 'Voided by user');
      
      // Reload data
      await loadShiftData();
    } catch (error) {
      console.error('Error voiding shift:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleXReport = async () => {
    if (!shift) return;
    
    try {
      const reportData = await shiftService.xReportData(shift.id!);
      // TODO: Open print modal
      console.log('X Report data:', reportData);
    } catch (error) {
      console.error('Error generating X report:', error);
    }
  };

  const handleZReport = async () => {
    if (!shift) return;
    
    try {
      const reportData = await shiftService.zReportData(shift.id!);
      // TODO: Open print modal
      console.log('Z Report data:', reportData);
    } catch (error) {
      console.error('Error generating Z report:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">Open</Badge>;
      case 'CLOSED':
        return <Badge variant="primary">Closed</Badge>;
      case 'VOID':
        return <Badge variant="danger">Void</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMovementTypeLabel = (type: ShiftMovementType) => {
    switch (type) {
      case 'CASH_IN': return 'Cash In';
      case 'CASH_OUT': return 'Cash Out';
      case 'DROP': return 'Drop';
      case 'PICKUP': return 'Pickup';
      case 'PETTY': return 'Petty Cash';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-gray-900">Shift not found</h2>
          <p className="text-gray-600">The requested shift could not be found.</p>
          <Button onClick={() => navigate('/shifts')} className="mt-4">
            Back to Shifts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/shifts')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Session</h1>
          <p className="text-gray-600">
            Terminal: {shift.terminal_name} | Cashier: {shift.cashier_id}
          </p>
        </div>
        <div className="ml-auto">
          {getStatusBadge(shift.status || 'OPEN')}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Shift Header */}
          <Card>
            <CardHeader>
              <CardTitle>Shift Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormLabel>Opened At</FormLabel>
                  <p className="text-sm text-gray-600">
                    {shift.opened_at ? formatDateTime(shift.opened_at) : '-'}
                  </p>
                </div>
                <div>
                  <FormLabel>Closed At</FormLabel>
                  <p className="text-sm text-gray-600">
                    {shift.closed_at ? formatDateTime(shift.closed_at) : '-'}
                  </p>
                </div>
              </div>
              
              <div>
                <FormLabel>Opening Cash</FormLabel>
                <p className="text-lg font-semibold text-gray-900">
                  {formatCurrency(shift.opening_cash)}
                </p>
              </div>
              
              {shift.status === 'CLOSED' && (
                <div>
                  <FormLabel>Declared Cash</FormLabel>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(shift.declared_cash || 0)}
                  </p>
                </div>
              )}
              
              {shift.note && (
                <div>
                  <FormLabel>Note</FormLabel>
                  <p className="text-sm text-gray-600">{shift.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Movements */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Movements</CardTitle>
            </CardHeader>
            <CardContent>
              {shift.status === 'OPEN' && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Add Movement</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FormLabel>Type</FormLabel>
                        <Select
                          value={movementType}
                          onChange={(value: string) => setMovementType(value as ShiftMovementType)}
                          options={[
                            { value: 'CASH_IN', label: 'Cash In' },
                            { value: 'CASH_OUT', label: 'Cash Out' },
                            { value: 'DROP', label: 'Drop' },
                            { value: 'PICKUP', label: 'Pickup' },
                            { value: 'PETTY', label: 'Petty Cash' }
                          ]}
                        />
                      </div>
                      <div>
                        <FormLabel>Amount</FormLabel>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={movementAmount}
                          onChange={(e) => setMovementAmount(e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <FormLabel>Reason (Optional)</FormLabel>
                      <Input
                        value={movementReason}
                        onChange={(e) => setMovementReason(e.target.value)}
                        placeholder="Enter reason..."
                      />
                    </div>
                    <Button
                      onClick={handleAddMovement}
                      disabled={saving || !movementAmount || parseFloat(movementAmount) <= 0}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Movement
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {movements.map((movement) => (
                  <div key={movement.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{getMovementTypeLabel(movement.type)}</p>
                      <p className="text-sm text-gray-600">
                        {movement.datetime ? formatDateTime(movement.datetime) : '-'}
                        {movement.reason && ` • ${movement.reason}`}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(movement.amount)}</p>
                  </div>
                ))}
                
                {movements.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No movements recorded</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sales Summary */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>Sales Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Invoices</FormLabel>
                    <p className="text-lg font-semibold">{summary.sales.invoices}</p>
                  </div>
                  <div>
                    <FormLabel>Gross Sales</FormLabel>
                    <p className="text-lg font-semibold">{formatCurrency(summary.sales.gross)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FormLabel>Discount</FormLabel>
                    <p className="text-sm text-gray-600">{formatCurrency(summary.sales.discount)}</p>
                  </div>
                  <div>
                    <FormLabel>Tax</FormLabel>
                    <p className="text-sm text-gray-600">{formatCurrency(summary.sales.tax)}</p>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <FormLabel>Net Sales</FormLabel>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(summary.sales.net)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleXReport}
                className="w-full justify-start"
                variant="outline"
              >
                <FileText className="h-4 w-4 mr-2" />
                X Report
              </Button>
              
              {shift.status === 'OPEN' && (
                <Button
                  onClick={() => setShowCloseModal(true)}
                  className="w-full justify-start"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Close Shift
                </Button>
              )}
              
              {shift.status === 'CLOSED' && (
                <Button
                  onClick={handleZReport}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Z Report
                </Button>
              )}
              
              {shift.status === 'OPEN' && (
                <Button
                  onClick={handleVoidShift}
                  className="w-full justify-start"
                  variant="danger"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Void Shift
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Cash Drawer Math */}
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>Cash Drawer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Opening Cash:</span>
                    <span>{formatCurrency(summary.cashDrawer.opening)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Sales:</span>
                    <span>{formatCurrency(summary.payments.cash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash In:</span>
                    <span className="text-green-600">+{formatCurrency(summary.cashDrawer.cashIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Out:</span>
                    <span className="text-red-600">-{formatCurrency(summary.cashDrawer.cashOut)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drops:</span>
                    <span className="text-red-600">-{formatCurrency(summary.cashDrawer.drops)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Petty Cash:</span>
                    <span className="text-red-600">-{formatCurrency(summary.cashDrawer.petty)}</span>
                  </div>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Expected Cash:</span>
                    <span>{formatCurrency(summary.cashDrawer.expectedCash)}</span>
                  </div>
                  
                  {shift.status === 'CLOSED' && summary.cashDrawer.declaredCash !== null && (
                    <>
                      <div className="flex justify-between">
                        <span>Declared Cash:</span>
                        <span>{formatCurrency(summary.cashDrawer.declaredCash || 0)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${
                        (summary.cashDrawer.variance || 0) === 0 ? 'text-green-600' : 
                        (summary.cashDrawer.variance || 0) > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        <span>Variance:</span>
                        <span>
                          {(summary.cashDrawer.variance || 0) >= 0 ? '+' : ''}
                          {formatCurrency(summary.cashDrawer.variance || 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Close Shift Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Close Shift</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <FormLabel>Declared Cash Amount</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={declaredCash}
                  onChange={(e) => setDeclaredCash(e.target.value)}
                  placeholder="Enter counted cash amount"
                />
              </div>
              
              <div>
                <FormLabel>Note (Optional)</FormLabel>
                <Textarea
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="Enter closing note..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleCloseShift}
                  disabled={saving || !declaredCash || parseFloat(declaredCash) < 0}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Close Shift
                </Button>
                <Button
                  onClick={() => setShowCloseModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
