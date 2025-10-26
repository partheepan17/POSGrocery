/**
 * Usage Analytics Dashboard
 * Displays feature usage statistics and recommendations
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Calendar, TrendingUp, TrendingDown, Minus, Users, Activity, BarChart3, Sparkles } from 'lucide-react';
import { telemetryService, UsageAnalytics, FeatureSummary, FeatureRecommendation } from '@/services/telemetryService';
import { SparklineChart } from './SparklineChart';
import { useTelemetry } from '@/hooks/useTelemetry';

interface UsageAnalyticsDashboardProps {
  className?: string;
}

export function UsageAnalyticsDashboard({ className }: UsageAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<FeatureRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedFeature, setSelectedFeature] = useState<string>('all');

  const { trackClick, trackInteraction } = useTelemetry({
    featureCode: 'admin.analytics',
    component: 'UsageAnalyticsDashboard'
  });

  useEffect(() => {
    loadAnalytics();
    loadRecommendations();
  }, [selectedPeriod, selectedFeature]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      
      switch (selectedPeriod) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      const data = await telemetryService.getUsageAnalytics({
        featureCode: selectedFeature === 'all' ? undefined : selectedFeature,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: 'day',
        limit: 30
      });

      setAnalytics(data);
      trackInteraction('analytics_loaded', 'admin.analytics');

    } catch (err: any) {
      setError(err.message);
      trackInteraction('analytics_error', 'admin.analytics');
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const data = await telemetryService.getFeatureRecommendations();
      setRecommendations(data);
    } catch (err: any) {
      console.error('Failed to load recommendations:', err);
    }
  };

  const getTrendIcon = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'increasing' | 'decreasing' | 'stable') => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600';
      case 'decreasing':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case 'enable_default':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'disable_default':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'deprecate':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'promote':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'enable_default':
        return <TrendingUp className="h-4 w-4" />;
      case 'disable_default':
        return <TrendingDown className="h-4 w-4" />;
      case 'deprecate':
        return <Activity className="h-4 w-4" />;
      case 'promote':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Usage Analytics</h2>
          <div className="flex space-x-2">
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Usage Analytics</h2>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Failed to load analytics: {error}</p>
              <Button 
                onClick={() => {
                  trackClick('retry_analytics');
                  loadAnalytics();
                }}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const topFeatures = analytics.summary
    .sort((a, b) => b.totalUsage - a.totalUsage)
    .slice(0, 10);

  const totalUsage = analytics.summary.reduce((sum, feature) => sum + feature.totalUsage, 0);
  const totalFeatures = analytics.summary.length;
  const avgUsagePerFeature = totalFeatures > 0 ? Math.round(totalUsage / totalFeatures) : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usage Analytics</h2>
          <p className="text-gray-600">Feature usage statistics and recommendations</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={(value: any) => {
            setSelectedPeriod(value);
            trackClick('change_period');
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedFeature} onValueChange={(value) => {
            setSelectedFeature(value);
            trackClick('change_feature');
          }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Features</SelectItem>
              {analytics.summary.map((feature) => (
                <SelectItem key={feature.featureCode} value={feature.featureCode}>
                  {feature.featureCode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            onClick={() => {
              trackClick('refresh_analytics');
              loadAnalytics();
            }}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {selectedPeriod} period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Features</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFeatures}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.metadata.totalDataPoints} data points
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUsagePerFeature.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              per feature
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground">
              available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Top Features</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends</CardTitle>
                <CardDescription>Feature usage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.usageData).slice(0, 5).map(([featureCode, data]) => (
                    <div key={featureCode} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{featureCode}</p>
                        <div className="h-8 w-32">
                          <SparklineChart data={data.map(d => d.usage)} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {data[data.length - 1]?.usage || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Feature Health */}
            <Card>
              <CardHeader>
                <CardTitle>Feature Health</CardTitle>
                <CardDescription>Usage patterns and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topFeatures.slice(0, 5).map((feature) => (
                    <div key={feature.featureCode} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{feature.featureCode}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {feature.totalUsage} uses
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {feature.totalUniqueUsers} users
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getTrendIcon(feature.usageTrend)}
                        <span className={`text-sm ${getTrendColor(feature.usageTrend)}`}>
                          {feature.usageTrend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Features by Usage</CardTitle>
              <CardDescription>Most used features in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topFeatures.map((feature, index) => (
                  <div key={feature.featureCode} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{feature.featureCode}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center space-x-1">
                            <Activity className="h-4 w-4" />
                            <span>{feature.totalUsage} uses</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{feature.totalUniqueUsers} users</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{feature.activeDays} days</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(feature.usageTrend)}
                      <span className={`text-sm ${getTrendColor(feature.usageTrend)}`}>
                        {feature.usageTrend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Recommendations</CardTitle>
              <CardDescription>AI-powered suggestions based on usage data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recommendations available</p>
                    <p className="text-sm">Check back later for AI-powered suggestions</p>
                  </div>
                ) : (
                  recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getRecommendationIcon(rec.recommendation)}
                            <Badge className={getRecommendationColor(rec.recommendation)}>
                              {rec.recommendation.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">
                              {Math.round(rec.confidence * 100)}% confidence
                            </Badge>
                          </div>
                          <p className="font-medium">{rec.featureCode}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {rec.reasoning}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => trackClick('apply_recommendation')}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
