/**
 * Anomalies Route
 * Anomaly detection and reporting
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';
import { authenticateToken, requireRole } from '../middleware/auth';
import { anomalyDetector } from '../utils/anomalyDetector';

const router = Router();

// Request validation schemas
const AnomalyQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.enum(['sales_volume', 'margin', 'voids', 'discounts', 'timing']).optional(),
  rule_id: z.string().optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional()
});

const RuleUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  threshold: z.number().min(0).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  window_days: z.number().min(1).max(365).optional()
});

// GET /api/reports/anomalies - Get anomalies report
router.get('/api/reports/anomalies',
  authenticateToken,
  requireRole(['admin', 'manager', 'cashier']),
  auditPerformance('anomalies_report'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'anomalies_report', requestId: req.requestId });
    
    try {
      // Validate query parameters
      const validationResult = AnomalyQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid anomaly query parameters',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { 
        start, 
        end, 
        severity, 
        category, 
        rule_id, 
        limit = 100, 
        offset = 0 
      } = validationResult.data;
      
      // Set default date range if not provided
      const endDate = end || new Date().toISOString().split('T')[0];
      const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      requestLogger.info({ 
        startDate, 
        endDate, 
        severity, 
        category, 
        rule_id, 
        limit, 
        offset 
      }, 'Generating anomalies report');
      
      // Detect anomalies
      const allAnomalies = await anomalyDetector.detectAnomalies(startDate, endDate);
      
      // Apply filters
      let filteredAnomalies = allAnomalies;
      
      if (severity) {
        filteredAnomalies = filteredAnomalies.filter(a => a.severity === severity);
      }
      
      if (category) {
        const rules = anomalyDetector.getRules();
        const categoryRules = rules.filter(r => r.category === category).map(r => r.id);
        filteredAnomalies = filteredAnomalies.filter(a => categoryRules.includes(a.rule_id));
      }
      
      if (rule_id) {
        filteredAnomalies = filteredAnomalies.filter(a => a.rule_id === rule_id);
      }
      
      // Apply pagination
      const paginatedAnomalies = filteredAnomalies.slice(offset, offset + limit);
      
      // Get summary
      const summary = await anomalyDetector.getAnomalySummary(filteredAnomalies);
      
      requestLogger.info({ 
        totalAnomalies: allAnomalies.length,
        filteredAnomalies: filteredAnomalies.length,
        returnedAnomalies: paginatedAnomalies.length
      }, 'Anomalies report generated');
      
      res.json({
        ok: true,
        data: {
          anomalies: paginatedAnomalies,
          summary,
          pagination: {
            total: filteredAnomalies.length,
            limit,
            offset,
            has_more: offset + limit < filteredAnomalies.length
          },
          filters: {
            start_date: startDate,
            end_date: endDate,
            severity: severity || null,
            category: category || null,
            rule_id: rule_id || null
          },
          generated_at: new Date().toISOString()
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to generate anomalies report', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to generate anomalies report',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/reports/anomalies/summary - Get anomalies summary
router.get('/api/reports/anomalies/summary',
  authenticateToken,
  requireRole(['admin', 'manager', 'cashier']),
  auditPerformance('anomalies_summary'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'anomalies_summary', requestId: req.requestId });
    
    try {
      const { start, end } = req.query;
      const endDate = (end as string) || new Date().toISOString().split('T')[0];
      const startDate = (start as string) || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      requestLogger.info({ startDate, endDate }, 'Generating anomalies summary');
      
      const anomalies = await anomalyDetector.detectAnomalies(startDate, endDate);
      const summary = await anomalyDetector.getAnomalySummary(anomalies);
      
      requestLogger.info({ 
        totalAnomalies: summary.total_anomalies,
        criticalAnomalies: summary.by_severity.critical
      }, 'Anomalies summary generated');
      
      res.json({
        ok: true,
        data: summary,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to generate anomalies summary', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to generate anomalies summary',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/reports/anomalies/rules - Get anomaly detection rules
router.get('/api/reports/anomalies/rules',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('anomalies_rules'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'anomalies_rules', requestId: req.requestId });
    
    try {
      const rules = anomalyDetector.getRules();
      
      requestLogger.info({ rulesCount: rules.length }, 'Anomaly rules retrieved');
      
      res.json({
        ok: true,
        data: {
          rules,
          total_rules: rules.length,
          enabled_rules: rules.filter(r => r.enabled).length
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get anomaly rules', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to get anomaly rules',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// PUT /api/reports/anomalies/rules/:ruleId - Update anomaly rule
router.put('/api/reports/anomalies/rules/:ruleId',
  authenticateToken,
  requireRole(['admin']),
  auditPerformance('anomalies_rule_update'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'anomalies_rule_update', requestId: req.requestId });
    
    try {
      const { ruleId } = req.params;
      
      // Validate request body
      const validationResult = RuleUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid rule update parameters',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const updates = validationResult.data;
      
      requestLogger.info({ ruleId, updates }, 'Updating anomaly rule');
      
      const success = anomalyDetector.updateRule(ruleId, updates);
      
      if (!success) {
        res.status(404).json(createStandardError(
          'Anomaly rule not found',
          ERROR_CODES.NOT_FOUND,
          { ruleId },
          req.requestId
        ));
        return;
      }
      
      requestLogger.info({ ruleId }, 'Anomaly rule updated successfully');
      
      res.json({
        ok: true,
        data: { 
          message: 'Rule updated successfully',
          rule_id: ruleId,
          updates
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to update anomaly rule', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to update anomaly rule',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/reports/anomalies/detect - Manually trigger anomaly detection
router.post('/api/reports/anomalies/detect',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('anomalies_detect'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'anomalies_detect', requestId: req.requestId });
    
    try {
      const { start, end } = req.body;
      
      if (!start || !end) {
        res.status(400).json(createStandardError(
          'Start and end dates are required',
          ERROR_CODES.INVALID_INPUT,
          { start, end },
          req.requestId
        ));
        return;
      }
      
      requestLogger.info({ start, end }, 'Manually triggering anomaly detection');
      
      const anomalies = await anomalyDetector.detectAnomalies(start, end);
      const summary = await anomalyDetector.getAnomalySummary(anomalies);
      
      requestLogger.info({ 
        anomaliesDetected: anomalies.length,
        criticalAnomalies: summary.by_severity.critical
      }, 'Manual anomaly detection completed');
      
      res.json({
        ok: true,
        data: {
          anomalies,
          summary,
          detection_period: {
            start,
            end
          },
          detected_at: new Date().toISOString()
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to detect anomalies', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to detect anomalies',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/reports/anomalies/export - Export anomalies as CSV
router.get('/api/reports/anomalies/export',
  authenticateToken,
  requireRole(['admin', 'manager']),
  auditPerformance('anomalies_export'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'anomalies_export', requestId: req.requestId });
    
    try {
      const { start, end } = req.query;
      const endDate = (end as string) || new Date().toISOString().split('T')[0];
      const startDate = (start as string) || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      requestLogger.info({ startDate, endDate }, 'Exporting anomalies to CSV');
      
      const anomalies = await anomalyDetector.detectAnomalies(startDate, endDate);
      const csvData = generateAnomaliesCSV(anomalies);
      
      const filename = `anomalies-report-${startDate}-to-${endDate}.csv`;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
      
      requestLogger.info({ 
        anomaliesExported: anomalies.length,
        filename
      }, 'Anomalies exported to CSV');
      
    } catch (error: any) {
      requestLogger.error('Failed to export anomalies', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to export anomalies',
        ERROR_CODES.INTERNAL_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

/**
 * Generate CSV data for anomalies report
 */
function generateAnomaliesCSV(anomalies: any[]): string {
  const headers = [
    'Anomaly ID',
    'Rule Name',
    'Severity',
    'Description',
    'Detected At',
    'Value',
    'Threshold',
    'Deviation',
    'Invoice ID',
    'Receipt No',
    'Cashier Name',
    'Terminal Name',
    'Customer Name',
    'Context Data'
  ];
  
  const rows = anomalies.map(anomaly => [
    anomaly.id,
    anomaly.rule_name,
    anomaly.severity,
    anomaly.description,
    anomaly.detected_at,
    anomaly.value,
    anomaly.threshold,
    anomaly.deviation,
    anomaly.context.invoice_id || '',
    anomaly.context.receipt_no || '',
    anomaly.context.cashier_name || '',
    anomaly.context.terminal_name || '',
    anomaly.context.customer_name || '',
    JSON.stringify(anomaly.metadata)
  ]);
  
  return [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');
}

export { router as anomaliesRouter };










