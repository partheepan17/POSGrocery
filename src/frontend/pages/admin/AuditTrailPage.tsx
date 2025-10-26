import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Separator } from '@/components/ui/Separator';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock
} from 'lucide-react';
// import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  actor: {
    id: number;
    username: string;
    email: string;
    name: string;
  };
  action: string;
  payload: any;
  diff: {
    before?: any;
    after?: any;
    changes?: Array<{
      field: string;
      before: any;
      after: any;
    }>;
  };
  createdAt: string;
  timestamp: string;
}

interface FilterOptions {
  actors: Array<{ username: string; name: string }>;
  actions: string[];
  featureCodes: string[];
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface AuditFilters {
  actor?: string;
  action?: string;
  featureCode?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
  sortBy: 'created_at' | 'actor_id' | 'action';
  sortOrder: 'asc' | 'desc';
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'FEATURE_TOGGLE': <Activity className="h-4 w-4" />,
  'ROLE_FEATURE_OVERRIDE': <User className="h-4 w-4" />,
  'USER_CREATE': <User className="h-4 w-4" />,
  'USER_UPDATE': <User className="h-4 w-4" />,
  'ROLE_PERMISSION_GRANT': <CheckCircle className="h-4 w-4" />,
  'ROLE_PERMISSION_REVOKE': <XCircle className="h-4 w-4" />,
  'LOGIN': <CheckCircle className="h-4 w-4" />,
  'LOGOUT': <XCircle className="h-4 w-4" />,
  'DEFAULT': <Info className="h-4 w-4" />
};

const ACTION_COLORS: Record<string, string> = {
  'FEATURE_TOGGLE': 'bg-blue-100 text-blue-800',
  'ROLE_FEATURE_OVERRIDE': 'bg-purple-100 text-purple-800',
  'USER_CREATE': 'bg-green-100 text-green-800',
  'USER_UPDATE': 'bg-yellow-100 text-yellow-800',
  'ROLE_PERMISSION_GRANT': 'bg-green-100 text-green-800',
  'ROLE_PERMISSION_REVOKE': 'bg-red-100 text-red-800',
  'LOGIN': 'bg-green-100 text-green-800',
  'LOGOUT': 'bg-gray-100 text-gray-800',
  'DEFAULT': 'bg-gray-100 text-gray-800'
};

export const AuditTrailPage: React.FC = () => {
  // const { toast } = useToast();
  
  // State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    actors: [],
    actions: [],
    featureCodes: []
  });
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  });
  const [filters, setFilters] = useState<AuditFilters>({
    limit: 50,
    offset: 0,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Load audit logs
  const loadAuditLogs = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      if (filters.actor) queryParams.append('actor', filters.actor);
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.featureCode) queryParams.append('featureCode', filters.featureCode);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('limit', filters.limit.toString());
      queryParams.append('offset', filters.offset.toString());
      queryParams.append('sortBy', filters.sortBy);
      queryParams.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/admin/audit?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load audit logs');
      }

      const data = await response.json();
      setAuditLogs(data.data.logs);
      setPagination(data.data.pagination);
      setFilterOptions(data.data.filters);
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
      setHasError(true);
      setError(err.message);
      // toast({
      //   title: 'Error',
      //   description: err.message,
      //   variant: 'destructive'
      // });
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Load audit logs on mount and when filters change
  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0 // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({
      ...prev,
      offset: newOffset
    }));
  };

  // Export audit logs
  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.actor) queryParams.append('actor', filters.actor);
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.featureCode) queryParams.append('featureCode', filters.featureCode);
      if (filters.startDate) queryParams.append('startDate', filters.startDate);
      if (filters.endDate) queryParams.append('endDate', filters.endDate);
      queryParams.append('format', format);

      const response = await fetch(`/api/admin/audit/export?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to export audit logs');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      // toast({
      //   title: 'Success',
      //   description: `Audit trail exported as ${format.toUpperCase()}`,
      //   variant: 'default'
      // });
    } catch (err: any) {
      console.error('Export failed:', err);
      // toast({
      //   title: 'Error',
      //   description: err.message,
      //   variant: 'destructive'
      // });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      limit: 50,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
  };

  // Get action icon and color
  const getActionDisplay = (action: string) => {
    const icon = ACTION_ICONS[action] || ACTION_ICONS.DEFAULT;
    const colorClass = ACTION_COLORS[action] || ACTION_COLORS.DEFAULT;
    return { icon, colorClass };
  };

  // Format diff for display
  const formatDiff = (diff: AuditLog['diff']) => {
    if (diff.changes && diff.changes.length > 0) {
      return diff.changes.map(change => (
        <div key={change.field} className="flex items-center gap-2 text-sm">
          <span className="font-medium">{change.field}:</span>
          <Badge variant="outline" className="text-xs">
            {String(change.before)}
          </Badge>
          <span>→</span>
          <Badge variant="outline" className="text-xs">
            {String(change.after)}
          </Badge>
        </div>
      ));
    }

    if (diff.before !== undefined && diff.after !== undefined) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs">
            {String(diff.before)}
          </Badge>
          <span>→</span>
          <Badge variant="outline" className="text-xs">
            {String(diff.after)}
          </Badge>
        </div>
      );
    }

    return <span className="text-sm text-muted-foreground">No changes</span>;
  };

  if (hasError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load audit trail: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">
            Track all system changes and user actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => loadAuditLogs()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => handleExport('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="filters">Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filter Audit Logs</CardTitle>
              <CardDescription>
                Narrow down the audit trail to specific criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="actor-filter">Actor</Label>
                  <Select
                    value={filters.actor || ''}
                    onValueChange={(value) => handleFilterChange('actor', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All actors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All actors</SelectItem>
                      {filterOptions.actors.map((actor) => (
                        <SelectItem key={actor.username} value={actor.username}>
                          {actor.name || actor.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action-filter">Action</Label>
                  <Select
                    value={filters.action || ''}
                    onValueChange={(value) => handleFilterChange('action', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All actions</SelectItem>
                      {filterOptions.actions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feature-filter">Feature Code</Label>
                  <Select
                    value={filters.featureCode || ''}
                    onValueChange={(value) => handleFilterChange('featureCode', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All features" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All features</SelectItem>
                      {filterOptions.featureCodes.map((featureCode) => (
                        <SelectItem key={featureCode} value={featureCode}>
                          {featureCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="datetime-local"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="datetime-local"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sort-by">Sort By</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => handleFilterChange('sortBy', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date</SelectItem>
                      <SelectItem value="actor_id">Actor</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={clearFilters} variant="outline">
                  Clear Filters
                </Button>
                <Button onClick={() => loadAuditLogs()} disabled={isLoading}>
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Total Logs</p>
                    <p className="text-2xl font-bold">{pagination.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Unique Actors</p>
                    <p className="text-2xl font-bold">{filterOptions.actors.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium">Showing</p>
                    <p className="text-2xl font-bold">{auditLogs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium">Actions</p>
                    <p className="text-2xl font-bold">{filterOptions.actions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Audit Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>
                {pagination.total} total records • Showing {auditLogs.length} records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead>Changes</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => {
                      const { icon, colorClass } = getActionDisplay(log.action);
                      return (
                        <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">
                                  {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(log.timestamp), 'HH:mm:ss')}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">{log.actor.name || log.actor.username}</div>
                                <div className="text-xs text-muted-foreground">{log.actor.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={colorClass}>
                              <div className="flex items-center gap-1">
                                {icon}
                                {log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.payload.featureCode ? (
                              <Badge variant="outline" className="text-xs">
                                {log.payload.featureCode}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {formatDiff(log.diff)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(Math.max(0, filters.offset - filters.limit))}
                    disabled={filters.offset === 0 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(filters.offset + filters.limit)}
                    disabled={!pagination.hasMore || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Details Modal */}
      {selectedLog && (
        <Card className="fixed inset-4 z-50 bg-background border shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Audit Log Details</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">ID</Label>
                  <p className="text-sm">{selectedLog.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <p className="text-sm">{format(new Date(selectedLog.timestamp), 'PPpp')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Actor</Label>
                  <p className="text-sm">{selectedLog.actor.name || selectedLog.actor.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Action</Label>
                  <p className="text-sm">{selectedLog.action}</p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Changes</Label>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  {formatDiff(selectedLog.diff)}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Full Payload</Label>
                <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-40">
                  {JSON.stringify(selectedLog.payload, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
