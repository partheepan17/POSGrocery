/**
 * Terminals Route - Multi-terminal support
 * Handles terminal registration, management, and settings
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/error';
import { createContextLogger } from '../utils/logger';
import { getDatabase } from '../db';
import { createStandardError, ERROR_CODES } from '../utils/errorCodes';
import { auditPerformance } from '../middleware/auditLogger';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Request validation schemas
const TerminalRegistrationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional()
});

const TerminalUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(255).optional(),
  is_active: z.boolean().optional()
});

const TerminalSettingsSchema = z.object({
  settings: z.record(z.string(), z.any())
});

// GET /api/terminals - List all terminals
router.get('/api/terminals',
  auditPerformance('terminals_list'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'terminals_list', requestId: req.requestId });
    
    try {
      const db = getDatabase();
      
      const terminals = db.prepare(`
        SELECT 
          t.id,
          t.name,
          t.description,
          t.is_active,
          t.created_at,
          t.last_activity,
          t.created_by,
          u.name as created_by_name,
          COUNT(DISTINCT i.id) as total_sales,
          COUNT(DISTINCT qs.id) as total_quick_sales,
          COALESCE(SUM(i.net), 0) as total_revenue
        FROM terminals t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN invoices i ON t.id = i.terminal_id
        LEFT JOIN quick_sales_sessions qs ON t.id = qs.terminal_id
        GROUP BY t.id, t.name, t.description, t.is_active, t.created_at, t.last_activity, t.created_by, u.name
        ORDER BY t.created_at DESC
      `).all() as Array<{
        id: number;
        name: string;
        description: string | null;
        is_active: number;
        created_at: string;
        last_activity: string | null;
        created_by: number | null;
        created_by_name: string | null;
        total_sales: number;
        total_quick_sales: number;
        total_revenue: number;
      }>;
      
      requestLogger.info({ terminalCount: terminals.length }, 'Terminals list retrieved');
      
      res.json({
        ok: true,
        data: terminals,
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to retrieve terminals list', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to retrieve terminals list',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/terminals/register - Register a new terminal
router.post('/api/terminals/register',
  auditPerformance('terminals_register'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'terminals_register', requestId: req.requestId });
    
    try {
      // Validate request body
      const validationResult = TerminalRegistrationSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid terminal registration data',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { name, description } = validationResult.data;
      const db = getDatabase();
      
      // Check if terminal name already exists
      const existingTerminal = db.prepare(`
        SELECT id FROM terminals WHERE name = ? AND is_active = 1
      `).get(name) as { id: number } | undefined;
      
      if (existingTerminal) {
        res.status(409).json(createStandardError(
          'Terminal name already exists',
          ERROR_CODES.CONFLICT,
          { message: 'A terminal with this name already exists' },
          req.requestId
        ));
        return;
      }
      
      // Create new terminal
      const result = db.prepare(`
        INSERT INTO terminals (name, description, created_by)
        VALUES (?, ?, ?)
      `).run(name, description || null, req.user?.id || null);
      
      const terminalId = result.lastInsertRowid as number;
      
      // Create default settings for the terminal
      const defaultSettings = [
        { key: 'receipt_printer_enabled', value: 'true', type: 'boolean', description: 'Enable receipt printing' },
        { key: 'cash_drawer_enabled', value: 'true', type: 'boolean', description: 'Enable cash drawer' },
        { key: 'barcode_scanner_enabled', value: 'true', type: 'boolean', description: 'Enable barcode scanner' },
        { key: 'display_mode', value: 'portrait', type: 'string', description: 'Display orientation' },
        { key: 'auto_receipt_print', value: 'false', type: 'boolean', description: 'Auto print receipts' },
        { key: 'receipt_footer_text', value: 'Thank you for your business!', type: 'string', description: 'Receipt footer text' }
      ];
      
      const insertSetting = db.prepare(`
        INSERT INTO terminal_settings (terminal_id, setting_key, setting_value, setting_type, description)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      for (const setting of defaultSettings) {
        insertSetting.run(terminalId, setting.key, setting.value, setting.type, setting.description);
      }
      
      // Get the created terminal
      const terminal = db.prepare(`
        SELECT 
          id, name, description, is_active, created_at, last_activity, created_by
        FROM terminals 
        WHERE id = ?
      `).get(terminalId) as {
        id: number;
        name: string;
        description: string | null;
        is_active: number;
        created_at: string;
        last_activity: string | null;
        created_by: number | null;
      };
      
      requestLogger.info({ terminalId, terminalName: name }, 'Terminal registered successfully');
      
      res.status(201).json({
        ok: true,
        data: {
          terminal_id: terminalId,
          terminal: terminal
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to register terminal', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to register terminal',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// GET /api/terminals/:id - Get terminal details
router.get('/api/terminals/:id',
  auditPerformance('terminals_get'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'terminals_get', requestId: req.requestId });
    
    try {
      const terminalId = parseInt(req.params.id);
      if (isNaN(terminalId)) {
        res.status(400).json(createStandardError(
          'Invalid terminal ID',
          ERROR_CODES.INVALID_INPUT,
          { message: 'Terminal ID must be a number' },
          req.requestId
        ));
        return;
      }
      
      const db = getDatabase();
      
      // Get terminal details
      const terminal = db.prepare(`
        SELECT 
          t.id, t.name, t.description, t.is_active, t.created_at, t.last_activity, t.created_by,
          u.name as created_by_name
        FROM terminals t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = ?
      `).get(terminalId) as {
        id: number;
        name: string;
        description: string | null;
        is_active: number;
        created_at: string;
        last_activity: string | null;
        created_by: number | null;
        created_by_name: string | null;
      } | undefined;
      
      if (!terminal) {
        res.status(404).json(createStandardError(
          'Terminal not found',
          ERROR_CODES.NOT_FOUND,
          { message: 'Terminal with this ID does not exist' },
          req.requestId
        ));
        return;
      }
      
      // Get terminal settings
      const settings = db.prepare(`
        SELECT setting_key, setting_value, setting_type, description
        FROM terminal_settings
        WHERE terminal_id = ?
        ORDER BY setting_key
      `).all(terminalId) as Array<{
        setting_key: string;
        setting_value: string | null;
        setting_type: string;
        description: string | null;
      }>;
      
      // Convert settings to object
      const settingsObj = settings.reduce((acc, setting) => {
        let value: any = setting.setting_value;
        
        // Convert value based on type
        if (setting.setting_type === 'boolean') {
          value = value === 'true';
        } else if (setting.setting_type === 'number') {
          value = parseFloat(value || '0');
        } else if (setting.setting_type === 'json') {
          try {
            value = JSON.parse(value || '{}');
          } catch {
            value = {};
          }
        }
        
        acc[setting.setting_key] = value;
        return acc;
      }, {} as Record<string, any>);
      
      requestLogger.info({ terminalId }, 'Terminal details retrieved');
      
      res.json({
        ok: true,
        data: {
          ...terminal,
          settings: settingsObj
        },
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to get terminal details', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to get terminal details',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// PUT /api/terminals/:id - Update terminal
router.put('/api/terminals/:id',
  authenticateToken,
  requireRole('manager', 'admin'),
  auditPerformance('terminals_update'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'terminals_update', requestId: req.requestId });
    
    try {
      const terminalId = parseInt(req.params.id);
      if (isNaN(terminalId)) {
        res.status(400).json(createStandardError(
          'Invalid terminal ID',
          ERROR_CODES.INVALID_INPUT,
          { message: 'Terminal ID must be a number' },
          req.requestId
        ));
        return;
      }
      
      const validationResult = TerminalUpdateSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid terminal update data',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { name, description, is_active } = validationResult.data;
      const db = getDatabase();
      
      // Check if terminal exists
      const existingTerminal = db.prepare('SELECT id, name FROM terminals WHERE id = ?').get(terminalId) as { id: number; name: string } | undefined;
      if (!existingTerminal) {
        res.status(404).json(createStandardError(
          'Terminal not found',
          ERROR_CODES.NOT_FOUND,
          { message: 'Terminal with this ID does not exist' },
          req.requestId
        ));
        return;
      }
      
      // Check if new name conflicts with existing terminal
      if (name && name !== existingTerminal.name) {
        const nameConflict = db.prepare('SELECT id FROM terminals WHERE name = ? AND id != ? AND is_active = 1').get(name, terminalId) as { id: number } | undefined;
        if (nameConflict) {
          res.status(409).json(createStandardError(
            'Terminal name already exists',
            ERROR_CODES.CONFLICT,
            { message: 'A terminal with this name already exists' },
            req.requestId
          ));
          return;
        }
      }
      
      // Update terminal
      const updateFields = [];
      const updateValues = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(name);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(description);
      }
      if (is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(is_active ? 1 : 0);
      }
      
      if (updateFields.length > 0) {
        updateFields.push('updated_at = datetime("now")');
        updateValues.push(terminalId);
        
        db.prepare(`UPDATE terminals SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
      }
      
      requestLogger.info({ terminalId, updatedFields: updateFields.length }, 'Terminal updated successfully');
      
      res.json({
        ok: true,
        message: 'Terminal updated successfully',
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to update terminal', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to update terminal',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// PUT /api/terminals/:id/settings - Update terminal settings
router.put('/api/terminals/:id/settings',
  authenticateToken,
  requireRole('manager', 'admin'),
  auditPerformance('terminals_update_settings'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'terminals_update_settings', requestId: req.requestId });
    
    try {
      const terminalId = parseInt(req.params.id);
      if (isNaN(terminalId)) {
        res.status(400).json(createStandardError(
          'Invalid terminal ID',
          ERROR_CODES.INVALID_INPUT,
          { message: 'Terminal ID must be a number' },
          req.requestId
        ));
        return;
      }
      
      const validationResult = TerminalSettingsSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json(createStandardError(
          'Invalid terminal settings data',
          ERROR_CODES.INVALID_INPUT,
          { errors: validationResult.error.errors },
          req.requestId
        ));
        return;
      }
      
      const { settings } = validationResult.data;
      const db = getDatabase();
      
      // Check if terminal exists
      const terminal = db.prepare('SELECT id FROM terminals WHERE id = ?').get(terminalId) as { id: number } | undefined;
      if (!terminal) {
        res.status(404).json(createStandardError(
          'Terminal not found',
          ERROR_CODES.NOT_FOUND,
          { message: 'Terminal with this ID does not exist' },
          req.requestId
        ));
        return;
      }
      
      // Update settings
      const upsertSetting = db.prepare(`
        INSERT INTO terminal_settings (terminal_id, setting_key, setting_value, setting_type, description)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(terminal_id, setting_key) DO UPDATE SET
          setting_value = excluded.setting_value,
          updated_at = datetime('now')
      `);
      
      for (const [key, value] of Object.entries(settings)) {
        let stringValue: string;
        let type = 'string';
        
        if (typeof value === 'boolean') {
          stringValue = value.toString();
          type = 'boolean';
        } else if (typeof value === 'number') {
          stringValue = value.toString();
          type = 'number';
        } else if (typeof value === 'object') {
          stringValue = JSON.stringify(value);
          type = 'json';
        } else {
          stringValue = String(value);
        }
        
        upsertSetting.run(terminalId, key, stringValue, type, `Custom setting: ${key}`);
      }
      
      requestLogger.info({ terminalId, settingsCount: Object.keys(settings).length }, 'Terminal settings updated');
      
      res.json({
        ok: true,
        message: 'Terminal settings updated successfully',
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to update terminal settings', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to update terminal settings',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

// POST /api/terminals/:id/heartbeat - Update terminal last activity
router.post('/api/terminals/:id/heartbeat',
  auditPerformance('terminals_heartbeat'),
  asyncHandler(async (req: Request, res: Response) => {
    const requestLogger = createContextLogger({ operation: 'terminals_heartbeat', requestId: req.requestId });
    
    try {
      const terminalId = parseInt(req.params.id);
      if (isNaN(terminalId)) {
        res.status(400).json(createStandardError(
          'Invalid terminal ID',
          ERROR_CODES.INVALID_INPUT,
          { message: 'Terminal ID must be a number' },
          req.requestId
        ));
        return;
      }
      
      const db = getDatabase();
      
      // Update last activity
      db.prepare(`
        UPDATE terminals 
        SET last_activity = datetime('now')
        WHERE id = ?
      `).run(terminalId);
      
      requestLogger.debug({ terminalId }, 'Terminal heartbeat updated');
      
      res.json({
        ok: true,
        message: 'Heartbeat updated',
        requestId: req.requestId
      });
      
    } catch (error: any) {
      requestLogger.error('Failed to update terminal heartbeat', {
        error: error.message,
        requestId: req.requestId
      });
      
      res.status(500).json(createStandardError(
        'Failed to update terminal heartbeat',
        ERROR_CODES.DATABASE_ERROR,
        { error: error.message },
        req.requestId
      ));
    }
  })
);

export default router;











