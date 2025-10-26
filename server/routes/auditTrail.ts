/**
 * Audit Trail Routes
 * Provides audit log access with filtering, pagination, and export capabilities
 */

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { createContextLogger } from '../utils/logger';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { extractTenant, requirePolicy } from '../../src/middleware/policy';
import { getDatabase } from '../db/database';

const router = Router();
const logger = createContextLogger({ operation: 'audit_trail_routes' });

// Validation schemas
const AuditFiltersSchema = z.object({
  actor: z.string().optional(),
  action: z.string().optional(),
  featureCode: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['created_at', 'actor_id', 'action']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const ExportAuditSchema = z.object({
  actor: z.string().optional(),
  action: z.string().optional(),
  featureCode: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(['csv', 'json']).default('csv')
});

/**
 * GET /api/admin/audit
 * Get audit trail with filtering and pagination
 */
router.get('/api/admin/audit',
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.audit', permission: 'audit.view' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({
      operation: 'get_audit_trail',
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;
    const userId = req.user?.id!;

    try {
      // Validate query parameters
      const validationResult = AuditFiltersSchema.safeParse({
        ...req.query,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      });

      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        });
      }

      const filters = validationResult.data;
      const db = getDatabase();

      // Build query with filters
      let whereConditions = ['1=1'];
      let queryParams: any[] = [];

      // Tenant filter (always required)
      whereConditions.push('JSON_EXTRACT(payload_json, "$.tenantId") = ?');
      queryParams.push(tenantId);

      // Actor filter
      if (filters.actor) {
        whereConditions.push('u.username LIKE ?');
        queryParams.push(`%${filters.actor}%`);
      }

      // Action filter
      if (filters.action) {
        whereConditions.push('action = ?');
        queryParams.push(filters.action);
      }

      // Feature code filter
      if (filters.featureCode) {
        whereConditions.push('JSON_EXTRACT(payload_json, "$.featureCode") = ?');
        queryParams.push(filters.featureCode);
      }

      // Date range filters
      if (filters.startDate) {
        whereConditions.push('created_at >= ?');
        queryParams.push(filters.startDate);
      }

      if (filters.endDate) {
        whereConditions.push('created_at <= ?');
        queryParams.push(filters.endDate);
      }

      // Build the main query
      const baseQuery = `
        SELECT 
          al.id,
          al.actor_id,
          al.action,
          al.payload_json,
          al.created_at,
          u.username as actor_username,
          u.email as actor_email,
          u.first_name as actor_first_name,
          u.last_name as actor_last_name
        FROM audit_logs al
        LEFT JOIN users u ON al.actor_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY al.${filters.sortBy} ${filters.sortOrder}
        LIMIT ? OFFSET ?
      `;

      queryParams.push(filters.limit, filters.offset);

      // Execute query
      const auditLogs = db.prepare(baseQuery).all(queryParams) as Array<{
        id: number;
        actor_id: number;
        action: string;
        payload_json: string;
        created_at: string;
        actor_username: string;
        actor_email: string;
        actor_first_name: string;
        actor_last_name: string;
      }>;

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM audit_logs al
        LEFT JOIN users u ON al.actor_id = u.id
        WHERE ${whereConditions.slice(0, -2).join(' AND ')}
      `;

      const countParams = queryParams.slice(0, -2);
      const totalResult = db.prepare(countQuery).get(countParams) as { total: number };
      const total = totalResult.total;

      // Process audit logs to include parsed payload and diff information
      const processedLogs = auditLogs.map(log => {
        const payload = JSON.parse(log.payload_json);
        
        // Extract diff information
        const diff = extractDiff(payload, log.action);
        
        return {
          id: log.id,
          actor: {
            id: log.actor_id,
            username: log.actor_username,
            email: log.actor_email,
            name: `${log.actor_first_name || ''} ${log.actor_last_name || ''}`.trim() || log.actor_username
          },
          action: log.action,
          payload,
          diff,
          createdAt: log.created_at,
          timestamp: new Date(log.created_at).toISOString()
        };
      });

      // Get available filter options
      const filterOptions = await getFilterOptions(db, tenantId);

      requestLogger.info('Audit trail retrieved successfully', {
        tenantId,
        userId,
        totalLogs: processedLogs.length,
        totalCount: total,
        filters
      });

      res.json({
        ok: true,
        data: {
          logs: processedLogs,
          pagination: {
            total,
            limit: filters.limit,
            offset: filters.offset,
            hasMore: filters.offset + filters.limit < total
          },
          filters: filterOptions
        }
      });

    } catch (error: any) {
      requestLogger.error('Failed to retrieve audit trail', {
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
 * GET /api/admin/audit/export
 * Export audit trail as CSV or JSON
 */
router.get('/api/admin/audit/export',
  extractTenant,
  authenticateToken,
  requirePolicy({ feature: 'admin.audit', permission: 'audit.export' }),
  asyncHandler(async (req: AuthRequest, res) => {
    const requestLogger = createContextLogger({
      operation: 'export_audit_trail',
      requestId: req.requestId,
      userId: req.user?.id,
      tenantId: req.tenant
    });

    const tenantId = req.tenant!;
    const userId = req.user?.id!;

    try {
      // Validate query parameters
      const validationResult = ExportAuditSchema.safeParse(req.query);

      if (!validationResult.success) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid query parameters',
          details: validationResult.error.errors
        });
      }

      const filters = validationResult.data;
      const db = getDatabase();

      // Build query (similar to main audit endpoint but without pagination)
      let whereConditions = ['1=1'];
      let queryParams: any[] = [];

      // Tenant filter
      whereConditions.push('JSON_EXTRACT(payload_json, "$.tenantId") = ?');
      queryParams.push(tenantId);

      // Apply other filters
      if (filters.actor) {
        whereConditions.push('u.username LIKE ?');
        queryParams.push(`%${filters.actor}%`);
      }

      if (filters.action) {
        whereConditions.push('action = ?');
        queryParams.push(filters.action);
      }

      if (filters.featureCode) {
        whereConditions.push('JSON_EXTRACT(payload_json, "$.featureCode") = ?');
        queryParams.push(filters.featureCode);
      }

      if (filters.startDate) {
        whereConditions.push('created_at >= ?');
        queryParams.push(filters.startDate);
      }

      if (filters.endDate) {
        whereConditions.push('created_at <= ?');
        queryParams.push(filters.endDate);
      }

      const query = `
        SELECT 
          al.id,
          al.actor_id,
          al.action,
          al.payload_json,
          al.created_at,
          u.username as actor_username,
          u.email as actor_email,
          u.first_name as actor_first_name,
          u.last_name as actor_last_name
        FROM audit_logs al
        LEFT JOIN users u ON al.actor_id = u.id
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY al.created_at DESC
      `;

      const auditLogs = db.prepare(query).all(queryParams) as Array<{
        id: number;
        actor_id: number;
        action: string;
        payload_json: string;
        created_at: string;
        actor_username: string;
        actor_email: string;
        actor_first_name: string;
        actor_last_name: string;
      }>;

      // Process logs
      const processedLogs = auditLogs.map(log => {
        const payload = JSON.parse(log.payload_json);
        const diff = extractDiff(payload, log.action);
        
        return {
          id: log.id,
          actor: {
            id: log.actor_id,
            username: log.actor_username,
            email: log.actor_email,
            name: `${log.actor_first_name || ''} ${log.actor_last_name || ''}`.trim() || log.actor_username
          },
          action: log.action,
          payload,
          diff,
          createdAt: log.created_at,
          timestamp: new Date(log.created_at).toISOString()
        };
      });

      if (filters.format === 'csv') {
        // Generate CSV
        const csv = generateCSV(processedLogs);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-trail-${tenantId}-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        // Return JSON
        res.json({
          ok: true,
          data: {
            logs: processedLogs,
            exportedAt: new Date().toISOString(),
            filters
          }
        });
      }

      requestLogger.info('Audit trail exported successfully', {
        tenantId,
        userId,
        format: filters.format,
        recordCount: processedLogs.length
      });

    } catch (error: any) {
      requestLogger.error('Failed to export audit trail', {
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
 * Helper function to extract diff information from audit payload
 */
function extractDiff(payload: any, action: string): {
  before?: any;
  after?: any;
  changes?: Array<{
    field: string;
    before: any;
    after: any;
  }>;
} {
  const diff: any = {};

  // Extract before/after based on action type
  switch (action) {
    case 'FEATURE_TOGGLE':
    case 'ROLE_FEATURE_OVERRIDE':
      if (payload.previousState !== undefined && payload.newState !== undefined) {
        diff.before = payload.previousState;
        diff.after = payload.newState;
        diff.changes = [{
          field: 'isEnabled',
          before: payload.previousState,
          after: payload.newState
        }];
      }
      break;

    case 'USER_CREATE':
      diff.after = {
        username: payload.username,
        email: payload.email,
        role: payload.role
      };
      break;

    case 'USER_UPDATE':
      if (payload.changes) {
        diff.changes = Object.entries(payload.changes).map(([field, value]) => ({
          field,
          before: value.before,
          after: value.after
        }));
      }
      break;

    case 'ROLE_PERMISSION_GRANT':
    case 'ROLE_PERMISSION_REVOKE':
      diff.before = { permission: payload.permissionCode, granted: false };
      diff.after = { permission: payload.permissionCode, granted: true };
      break;

    default:
      // Generic diff extraction
      if (payload.before && payload.after) {
        diff.before = payload.before;
        diff.after = payload.after;
      }
  }

  return diff;
}

/**
 * Helper function to get available filter options
 */
async function getFilterOptions(db: any, tenantId: string) {
  try {
    // Get unique actors
    const actors = db.prepare(`
      SELECT DISTINCT u.username, u.first_name, u.last_name
      FROM audit_logs al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE JSON_EXTRACT(al.payload_json, "$.tenantId") = ?
      ORDER BY u.username
    `).all(tenantId);

    // Get unique actions
    const actions = db.prepare(`
      SELECT DISTINCT action
      FROM audit_logs
      WHERE JSON_EXTRACT(payload_json, "$.tenantId") = ?
      ORDER BY action
    `).all(tenantId);

    // Get unique feature codes
    const featureCodes = db.prepare(`
      SELECT DISTINCT JSON_EXTRACT(payload_json, "$.featureCode") as feature_code
      FROM audit_logs
      WHERE JSON_EXTRACT(payload_json, "$.tenantId") = ?
        AND JSON_EXTRACT(payload_json, "$.featureCode") IS NOT NULL
      ORDER BY feature_code
    `).all(tenantId);

    return {
      actors: actors.map(a => ({
        username: a.username,
        name: `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.username
      })),
      actions: actions.map(a => a.action),
      featureCodes: featureCodes.map(f => f.feature_code).filter(Boolean)
    };
  } catch (error) {
    console.error('Error getting filter options:', error);
    return {
      actors: [],
      actions: [],
      featureCodes: []
    };
  }
}

/**
 * Helper function to generate CSV from audit logs
 */
function generateCSV(logs: any[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Actor',
    'Action',
    'Feature Code',
    'Before',
    'After',
    'Changes',
    'Details'
  ];

  const rows = logs.map(log => [
    log.id,
    log.timestamp,
    log.actor.name || log.actor.username,
    log.action,
    log.payload.featureCode || '',
    log.diff.before ? JSON.stringify(log.diff.before) : '',
    log.diff.after ? JSON.stringify(log.diff.after) : '',
    log.diff.changes ? log.diff.changes.map(c => `${c.field}: ${c.before} → ${c.after}`).join('; ') : '',
    JSON.stringify(log.payload)
  ]);

  // Escape CSV values
  const escapeCSV = (value: any) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = [headers.map(escapeCSV).join(',')];
  csvRows.push(...rows.map(row => row.map(escapeCSV).join(',')));

  return csvRows.join('\n');
}

export { router as auditTrailRouter };










