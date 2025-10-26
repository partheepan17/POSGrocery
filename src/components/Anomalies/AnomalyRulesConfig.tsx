/**
 * Anomaly Rules Configuration Component
 * Manage anomaly detection rules and their settings
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { AlertTriangle, Settings, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnomalyRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  window_days: number;
  category: 'sales_volume' | 'margin' | 'voids' | 'discounts' | 'timing';
}

interface AnomalyRulesConfigProps {
  className?: string;
}

export const AnomalyRulesConfig: React.FC<AnomalyRulesConfigProps> = ({ className }) => {
  const [rules, setRules] = useState<AnomalyRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editedRule, setEditedRule] = useState<Partial<AnomalyRule>>({});

  // Load rules on component mount
  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports/anomalies/rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load rules');
      }

      const data = await response.json();
      setRules(data.data.rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const updateRule = async (ruleId: string, updates: Partial<AnomalyRule>) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/reports/anomalies/rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      // Update local state
      setRules(prevRules => 
        prevRules.map(rule => 
          rule.id === ruleId ? { ...rule, ...updates } : rule
        )
      );

      setEditingRule(null);
      setEditedRule({});
      setSuccess('Rule updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (rule: AnomalyRule) => {
    setEditingRule(rule.id);
    setEditedRule({ ...rule });
  };

  const cancelEditing = () => {
    setEditingRule(null);
    setEditedRule({});
  };

  const saveEditing = () => {
    if (editingRule && editedRule) {
      updateRule(editingRule, editedRule);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sales_volume':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'margin':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'voids':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'discounts':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'timing':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatThreshold = (rule: AnomalyRule) => {
    switch (rule.id) {
      case 'sales_spike':
        return `${rule.threshold}x`;
      case 'zero_margin':
        return `≤ LKR ${rule.threshold}`;
      case 'frequent_voids':
        return `≥ ${(rule.threshold * 100).toFixed(0)}%`;
      case 'excessive_discounts':
        return `≥ ${(rule.threshold * 100).toFixed(0)}%`;
      case 'off_hours_sales':
        return 'Outside 6 AM - 10 PM';
      case 'large_transaction':
        return `≥ LKR ${rule.threshold.toLocaleString()}`;
      default:
        return rule.threshold.toString();
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Anomaly Rules Configuration</h2>
          <p className="text-muted-foreground">
            Configure anomaly detection rules and thresholds
          </p>
        </div>
        <Button onClick={loadRules} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detection Rules</CardTitle>
          <CardDescription>
            {loading ? 'Loading rules...' : `${rules.length} rules configured`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading rules...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rule.name}</div>
                        <div className="text-sm text-muted-foreground">{rule.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCategoryColor(rule.category)}>
                        {rule.category.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getSeverityColor(rule.severity)}>
                        {rule.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingRule === rule.id ? (
                        <Input
                          type="number"
                          value={editedRule.threshold || rule.threshold}
                          onChange={(e) => setEditedRule(prev => ({ 
                            ...prev, 
                            threshold: parseFloat(e.target.value) 
                          }))}
                          className="w-24"
                        />
                      ) : (
                        <span className="font-mono text-sm">{formatThreshold(rule)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRule === rule.id ? (
                        <Input
                          type="number"
                          value={editedRule.window_days || rule.window_days}
                          onChange={(e) => setEditedRule(prev => ({ 
                            ...prev, 
                            window_days: parseInt(e.target.value) 
                          }))}
                          className="w-16"
                          min="1"
                          max="365"
                        />
                      ) : (
                        <span className="text-sm">{rule.window_days} days</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRule === rule.id ? (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={editedRule.enabled ?? rule.enabled}
                            onCheckedChange={(checked) => setEditedRule(prev => ({ 
                              ...prev, 
                              enabled: checked 
                            }))}
                          />
                          <Label className="text-sm">
                            {editedRule.enabled ?? rule.enabled ? 'Enabled' : 'Disabled'}
                          </Label>
                        </div>
                      ) : (
                        <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingRule === rule.id ? (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={saveEditing}
                            disabled={saving}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditing(rule)}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Rule Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sales Volume</CardTitle>
            <CardDescription>Detect unusual sales patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.filter(r => r.category === 'sales_volume').map(rule => (
                <div key={rule.id} className="flex items-center justify-between">
                  <span className="text-sm">{rule.name}</span>
                  <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                    {rule.enabled ? 'On' : 'Off'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Margin</CardTitle>
            <CardDescription>Detect margin-related issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.filter(r => r.category === 'margin').map(rule => (
                <div key={rule.id} className="flex items-center justify-between">
                  <span className="text-sm">{rule.name}</span>
                  <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                    {rule.enabled ? 'On' : 'Off'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Voids & Discounts</CardTitle>
            <CardDescription>Detect unusual void and discount patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.filter(r => r.category === 'voids' || r.category === 'discounts').map(rule => (
                <div key={rule.id} className="flex items-center justify-between">
                  <span className="text-sm">{rule.name}</span>
                  <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                    {rule.enabled ? 'On' : 'Off'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
