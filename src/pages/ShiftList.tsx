import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { FormLabel } from '../components/ui/Form';
import { Select, SelectOption } from '../components/ui/Dropdown';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import {
  Plus,
  Search,
  Eye,
  XCircle,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { shiftService } from '../services/shiftService';
import { useSettingsStore } from '../store/settingsStore';
import { Shift, ShiftStatus } from '../types';
import { useTranslation } from 'react-i18next';

export default function ShiftList() {
  const navigate = useNavigate();
  const t = useTranslation();
  const { settings } = useSettingsStore();
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShiftStatus | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadShifts();
  }, [searchTerm, statusFilter, dateFrom, dateTo]);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const params: any = {
        q: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        limit: 100
      };
      
      const result = await shiftService.listShifts(params);
      setShifts(result);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: ShiftStatus) => {
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

  const handleOpenNewShift = () => {
    navigate('/shifts/new');
  };

  const handleViewShift = (id: number) => {
    navigate(`/shifts/${id}`);
  };

  const handleXReport = async (id: number) => {
    try {
      const summary = await shiftService.xReportData(id);
      // TODO: Open print modal with X report
      console.log('X Report data:', summary);
    } catch (error) {
      console.error('Error generating X report:', error);
    }
  };

  const handleZReport = async (id: number) => {
    try {
      const summary = await shiftService.zReportData(id);
      // TODO: Open print modal with Z report
      console.log('Z Report data:', summary);
    } catch (error) {
      console.error('Error generating Z report:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
          <p className="text-gray-600">Manage cashier shifts and generate reports</p>
        </div>
        <Button onClick={handleOpenNewShift} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Shift
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <h3 >Filters</h3 >
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <FormLabel>Search</FormLabel>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search shifts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <FormLabel>Status</FormLabel>
              <Select
                value={statusFilter}
                onChange={(value: string) => setStatusFilter(value as ShiftStatus | 'ALL')}
                options={[
                  { value: 'ALL', label: 'All Status' },
                  { value: 'OPEN', label: 'Open' },
                  { value: 'CLOSED', label: 'Closed' },
                  { value: 'VOID', label: 'Void' }
                ]}
              />
            </div>
            
            <div>
              <FormLabel>From Date</FormLabel>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            
            <div>
              <FormLabel>To Date</FormLabel>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts Table */}
      <Card>
        <CardHeader>
          <h3 >Shifts ({shifts.length})</h3 >
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opened</TableHead>
                    <TableHead>Closed</TableHead>
                    <TableHead>Terminal</TableHead>
                    <TableHead>Cashier ID</TableHead>
                    <TableHead>Opening Cash</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shifts.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell>
                        {shift.opened_at ? formatDateTime(shift.opened_at) : '-'}
                      </TableCell>
                      <TableCell>
                        {shift.closed_at ? formatDateTime(shift.closed_at) : '-'}
                      </TableCell>
                      <TableCell>{shift.terminal_name}</TableCell>
                      <TableCell>{shift.cashier_id}</TableCell>
                      <TableCell>{formatCurrency(shift.opening_cash)}</TableCell>
                      <TableCell>{getStatusBadge(shift.status || 'OPEN')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewShift(shift.id!)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          {shift.status === 'OPEN' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleXReport(shift.id!)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {shift.status === 'CLOSED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleZReport(shift.id!)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {shifts.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No shifts found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
