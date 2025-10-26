/**
 * Telemetry Routes
 * Handles feature usage tracking and analytics
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { createContextLogger } from '../utils/logger';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { extractTenant, requirePolicy } from '../../src/middleware/policy';
import { getDatabase } from '../db/database';

const router = Router();
const logger = createContextLogger({ operation: 'telemetry_routes' });

// Validation schemas
const FeatureUsageSchema = z.object({
  featureCode: z.string().min(1).max(100),
  eventType: z.enum(['route_visit', 'action_click', 'feature_toggle', 'api_call', 'ui_interaction']),
  eventData: z.record(z.any()).optional(),
  metadata: z.object({
    route: z.string().optional(),
    component: z.string().optional(),
    action: z.string().optional(),
    duration: z.number().optional(), // milliseconds
    success: z.boolean().optional()
  }).optional()
});

const UsageAnalyticsSchema = z.object({
  featureCode: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  limit: z.number().int().min(1).max(365).default(30)
});

/**
 * POST /api/telemetry/feature-usage
 * Track feature usage events
 */
router.post('/api/telemetry/feature-usage',
  extractTenant,
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({
      operation: 'track_feature_usage',
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;
    const userId = req.user?.id!;

    try {
      // Validate request body
      const validationResult = FeatureUsageSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid request data',
          details: validationResult.error.errors
        });
      }

      const { featureCode, eventType, eventData, metadata } = validationResult.data;
      const db = getDatabase();

      // Insert usage event
      const eventId = db.prepare(`
        INSERT INTO feature_usage_events (
          tenant_id, user_id, feature_code, event_type, 
          event_data, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        tenantId,
        userId,
        featureCode,
        eventType,
        JSON.stringify(eventData || {}),
        req.ip || req.connection.remoteAddress,
        req.get('User-Agent'),
      ).lastInsertRowid;

      requestLogger.info('Feature usage tracked', {
        tenantId,
        userId,
        featureCode,
        eventType,
        eventId
      });

      res.json({
        ok: true,
        message: 'Feature usage tracked successfully',
        data: {
          eventId,
          featureCode,
          eventType,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      requestLogger.error('Failed to track feature usage', {
        tenantId,
        userId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/telemetry/usage-analytics
 * Get feature usage analytics and recommendations
 */
router.get('/api/telemetry/usage-analytics',
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.analytics', permission: 'analytics.view' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({
      operation: 'get_usage_analytics',
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;

    try {
      // Validate query parameters
      const validationResult = UsageAnalyticsSchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        });
      }

      const { featureCode, startDate, endDate, groupBy, limit } = validationResult.data;
      const db = getDatabase();

      // Set default date range (last 30 days)
      const defaultEndDate = new Date();
      const defaultStartDate = new Date();
      defaultStartDate.setDate(defaultStartDate.getDate() - 30);

      const start = startDate || defaultStartDate.toISOString();
      const end = endDate || defaultEndDate.toISOString();

      // Build query for usage analytics
      let whereConditions = ['tenant_id = ?'];
      let queryParams: any[] = [tenantId];

      if (featureCode) {
        whereConditions.push('feature_code = ?');
        queryParams.push(featureCode);
      }

      whereConditions.push('usage_date >= ?');
      whereConditions.push('usage_date <= ?');
      queryParams.push(start.split('T')[0], end.split('T')[0]);

      // Get usage data grouped by time period
      const groupByClause = groupBy === 'day' ? 'usage_date' :
                           groupBy === 'week' ? "strftime('%Y-%W', usage_date)" :
                           "strftime('%Y-%m', usage_date)";

      const usageQuery = `
        SELECT 
          feature_code,
          ${groupByClause} as period,
          SUM(usage_count) as total_usage,
          AVG(usage_count) as avg_usage,
          MAX(usage_count) as peak_usage,
          SUM(unique_users) as total_unique_users,
          COUNT(DISTINCT usage_date) as active_days
        FROM feature_usage_counters
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY feature_code, ${groupByClause}
        ORDER BY period DESC, total_usage DESC
        LIMIT ?
      `;

      queryParams.push(limit * 10); // Allow more results for grouping

      const usageData = db.prepare(usageQuery).all(queryParams) as Array<{
        feature_code: string;
        period: string;
        total_usage: number;
        avg_usage: number;
        peak_usage: number;
        total_unique_users: number;
        active_days: number;
      }>;

      // Get feature usage summary
      const summaryQuery = `
        SELECT 
          feature_code,
          SUM(usage_count) as total_usage,
          AVG(usage_count) as avg_daily_usage,
          MAX(usage_count) as peak_daily_usage,
          SUM(unique_users) as total_unique_users,
          COUNT(DISTINCT usage_date) as active_days,
          MIN(usage_date) as first_usage,
          MAX(usage_date) as last_usage
        FROM feature_usage_counters
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY feature_code
        ORDER BY total_usage DESC
      `;

      const summaryData = db.prepare(summaryQuery).all(queryParams.slice(0, -1)) as Array<{
        feature_code: string;
        total_usage: number;
        avg_daily_usage: number;
        peak_daily_usage: number;
        total_unique_users: number;
        active_days: number;
        first_usage: string;
        last_usage: string;
      }>;

      // Get recommendations
      const recommendations = await generateFeatureRecommendations(db, tenantId, summaryData);

      // Process data for frontend
      const processedUsageData = processUsageData(usageData, groupBy);
      const processedSummary = processSummaryData(summaryData);

      requestLogger.info('Usage analytics retrieved', {
        tenantId,
        featureCount: summaryData.length,
        dataPoints: usageData.length,
        recommendationsCount: recommendations.length
      });

      res.json({
        ok: true,
        data: {
          usageData: processedUsageData,
          summary: processedSummary,
          recommendations,
          period: {
            start,
            end,
            groupBy
          },
          metadata: {
            totalFeatures: summaryData.length,
            totalDataPoints: usageData.length,
            generatedAt: new Date().toISOString()
          }
        }
      });

    } catch (error: any) {
      requestLogger.error('Failed to get usage analytics', {
        tenantId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  })
);

/**
 * GET /api/telemetry/feature-recommendations
 * Get feature recommendations based on usage data
 */
router.get('/api/telemetry/feature-recommendations',
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.analytics', permission: 'analytics.view' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({
      operation: 'get_feature_recommendations',
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;

    try {
      const db = getDatabase();

      // Get stored recommendations
      const recommendations = db.prepare(`
        SELECT 
          feature_code,
          recommendation_type,
          confidence_score,
          reasoning,
          usage_data,
          created_at,
          expires_at,
          is_applied
        FROM feature_usage_recommendations
        WHERE tenant_id = ? 
        AND (expires_at IS NULL OR expires_at > datetime('now'))
        ORDER BY confidence_score DESC, created_at DESC
      `).all(tenantId) as Array<{
        feature_code: string;
        recommendation_type: string;
        confidence_score: number;
        reasoning: string;
        usage_data: string;
        created_at: string;
        expires_at: string | null;
        is_applied: boolean;
      }>;

      // Process recommendations
      const processedRecommendations = recommendations.map(rec => ({
        ...rec,
        usage_data: JSON.parse(rec.usage_data || '{}'),
        isExpired: rec.expires_at ? new Date(rec.expires_at) < new Date() : false
      }));

      requestLogger.info('Feature recommendations retrieved', {
        tenantId,
        recommendationsCount: processedRecommendations.length
      });

      res.json({
        ok: true,
        data: {
          recommendations: processedRecommendations,
          generatedAt: new Date().toISOString()
        }
      });

    } catch (error: any) {
      requestLogger.error('Failed to get feature recommendations', {
        tenantId,
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        ok: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  })
);

/**
 * Helper function to process usage data for frontend
 */
function processUsageData(usageData: any[], groupBy: string) {
  const groupedData: { [featureCode: string]: any[] } = {};

  usageData.forEach(item => {
    if (!groupedData[item.feature_code]) {
      groupedData[item.feature_code] = [];
    }

    groupedData[item.feature_code].push({
      period: item.period,
      usage: item.total_usage,
      avgUsage: Math.round(item.avg_usage * 100) / 100,
      peakUsage: item.peak_usage,
      uniqueUsers: item.total_unique_users,
      activeDays: item.active_days
    });
  });

  // Sort each feature's data by period
  Object.keys(groupedData).forEach(featureCode => {
    groupedData[featureCode].sort((a, b) => a.period.localeCompare(b.period));
  });

  return groupedData;
}

/**
 * Helper function to process summary data
 */
function processSummaryData(summaryData: any[]) {
  return summaryData.map(item => ({
    featureCode: item.feature_code,
    totalUsage: item.total_usage,
    avgDailyUsage: Math.round(item.avg_daily_usage * 100) / 100,
    peakDailyUsage: item.peak_daily_usage,
    totalUniqueUsers: item.total_unique_users,
    activeDays: item.active_days,
    firstUsage: item.first_usage,
    lastUsage: item.last_usage,
    usageTrend: calculateUsageTrend(item)
  }));
}

/**
 * Calculate usage trend (simple linear regression)
 */
function calculateUsageTrend(item: any): 'increasing' | 'decreasing' | 'stable' {
  // This is a simplified trend calculation
  // In a real implementation, you'd analyze the actual usage data over time
  const daysSinceFirst = Math.max(1, Math.ceil((new Date(item.last_usage).getTime() - new Date(item.first_usage).getTime()) / (1000 * 60 * 60 * 24)));
  const avgUsagePerDay = item.total_usage / daysSinceFirst;
  
  if (avgUsagePerDay > item.avg_daily_usage * 1.1) return 'increasing';
  if (avgUsagePerDay < item.avg_daily_usage * 0.9) return 'decreasing';
  return 'stable';
}

/**
 * Generate feature recommendations based on usage data
 */
async function generateFeatureRecommendations(db: any, tenantId: string, summaryData: any[]) {
  const recommendations = [];

  for (const feature of summaryData) {
    const featureCode = feature.feature_code;
    
    // Skip core features
    if (featureCode.startsWith('auth.') || featureCode === 'admin.all') {
      continue;
    }

    let recommendation = null;
    let confidence = 0;
    let reasoning = '';

    // High usage features - recommend enabling by default
    if (feature.total_usage > 100 && feature.active_days > 20) {
      recommendation = 'enable_default';
      confidence = Math.min(0.9, feature.total_usage / 1000);
      reasoning = `High usage feature: ${feature.total_usage} total uses, ${feature.active_days} active days`;
    }
    // Low usage features - recommend disabling by default
    else if (feature.total_usage < 10 && feature.active_days < 5) {
      recommendation = 'disable_default';
      confidence = Math.min(0.8, (10 - feature.total_usage) / 10);
      reasoning = `Low usage feature: ${feature.total_usage} total uses, ${feature.active_days} active days`;
    }
    // Unused features - recommend deprecation
    else if (feature.total_usage === 0 || feature.active_days === 0) {
      recommendation = 'deprecate';
      confidence = 0.9;
      reasoning = `Unused feature: no recorded usage`;
    }

    if (recommendation) {
      // Store recommendation in database
      db.prepare(`
        INSERT OR REPLACE INTO feature_usage_recommendations (
          tenant_id, feature_code, recommendation_type, 
          confidence_score, reasoning, usage_data, 
          created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now', '+30 days'))
      `).run(
        tenantId,
        featureCode,
        recommendation,
        confidence,
        reasoning,
        JSON.stringify(feature)
      );

      recommendations.push({
        featureCode,
        recommendation,
        confidence,
        reasoning,
        usageData: feature
      });
    }
  }

  return recommendations;
}

export { router as telemetryRouter };










