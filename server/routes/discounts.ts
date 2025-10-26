import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { createRequestLogger } from '../utils/structuredLogger';
import { createError, ErrorContext, AppError } from '../types/errors';

const discountRouter = Router();

// GET /api/discount-rules - Get discount rules
discountRouter.get('/api/discount-rules', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { getDatabase } = await import('../db');
    const db = getDatabase();
    
    const activeOnly = req.query.active === 'true';
    
    let query = `
      SELECT 
        id, name, applies_to, level, target_id, type, value, 
        channel, stack_mode, apply_quantity_rule, max_qty_or_weight,
        active, active_from, active_to, created_at, updated_at
      FROM discount_rules
    `;
    
    if (activeOnly) {
      query += ' WHERE active = 1 AND (active_from IS NULL OR active_from <= datetime("now")) AND (active_to IS NULL OR active_to >= datetime("now"))';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const rules = db.prepare(query).all();
    
    requestLogger.info({ 
      ruleCount: rules.length,
      activeOnly 
    }, 'Discount rules retrieved');
    
    res.json({ rules });
  } catch (error: any) {
    const context = {
      requestId: req.requestId,
      operation: 'GET_DISCOUNT_RULES',
      resource: '/api/discount-rules'
    };
    
    throw createError.databaseError('Failed to retrieve discount rules', error, context);
  }
}));

// POST /api/discount-rules - Create discount rule
discountRouter.post('/api/discount-rules', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { getDatabase } = await import('../db');
    const db = getDatabase();
    
    const {
      name,
      applies_to = 'PRODUCT',
      level = 'PRODUCT',
      target_id,
      type = 'PERCENT',
      value,
      channel = 'BOTH',
      stack_mode = 'EXCLUSIVE',
      apply_quantity_rule = true,
      max_qty_or_weight,
      active = true,
      active_from,
      active_to
    } = req.body;
    
    // Validate required fields
    if (!name || !target_id || value === undefined) {
      throw createError.invalidInput('Missing required fields: name, target_id, value');
    }
    
    const result = db.prepare(`
      INSERT INTO discount_rules (
        name, applies_to, level, target_id, type, value, channel, 
        stack_mode, apply_quantity_rule, max_qty_or_weight, 
        active, active_from, active_to, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      name, applies_to, level, target_id, type, value, channel,
      stack_mode, apply_quantity_rule, max_qty_or_weight,
      active, active_from, active_to
    );
    
    requestLogger.info({ 
      ruleId: result.lastInsertRowid,
      name,
      type,
      value
    }, 'Discount rule created');
    
    res.status(201).json({ 
      success: true, 
      rule: { 
        id: result.lastInsertRowid, 
        ...req.body 
      } 
    });
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('Missing required fields')) {
      throw error;
    }
    
    const context = {
      requestId: req.requestId,
      operation: 'CREATE_DISCOUNT_RULE',
      resource: '/api/discount-rules'
    };
    
    throw createError.databaseError('Failed to create discount rule', error, context);
  }
}));

// PUT /api/discount-rules/:id - Update discount rule
discountRouter.put('/api/discount-rules/:id', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { getDatabase } = await import('../db');
    const db = getDatabase();
    
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      throw createError.invalidInput('Invalid rule ID');
    }
    
    const {
      name, applies_to, level, target_id, type, value, channel,
      stack_mode, apply_quantity_rule, max_qty_or_weight,
      active, active_from, active_to
    } = req.body;
    
    const result = db.prepare(`
      UPDATE discount_rules SET
        name = COALESCE(?, name),
        applies_to = COALESCE(?, applies_to),
        level = COALESCE(?, level),
        target_id = COALESCE(?, target_id),
        type = COALESCE(?, type),
        value = COALESCE(?, value),
        channel = COALESCE(?, channel),
        stack_mode = COALESCE(?, stack_mode),
        apply_quantity_rule = COALESCE(?, apply_quantity_rule),
        max_qty_or_weight = COALESCE(?, max_qty_or_weight),
        active = COALESCE(?, active),
        active_from = COALESCE(?, active_from),
        active_to = COALESCE(?, active_to),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name, applies_to, level, target_id, type, value, channel,
      stack_mode, apply_quantity_rule, max_qty_or_weight,
      active, active_from, active_to, ruleId
    );
    
    if (result.changes === 0) {
      throw createError.notFound('Discount rule not found');
    }
    
    requestLogger.info({ 
      ruleId,
      changes: result.changes
    }, 'Discount rule updated');
    
    res.json({ success: true, changes: result.changes });
  } catch (error: any) {
    if (error instanceof Error && (error.message.includes('Invalid rule ID') || error.message.includes('not found'))) {
      throw error;
    }
    
    const context = {
      requestId: req.requestId,
      operation: 'UPDATE_DISCOUNT_RULE',
      resource: `/api/discount-rules/${req.params.id}`
    };
    
    throw createError.databaseError('Failed to update discount rule', error, context);
  }
}));

// DELETE /api/discount-rules/:id - Delete discount rule
discountRouter.delete('/api/discount-rules/:id', asyncHandler(async (req, res) => {
  const requestLogger = createRequestLogger(req);
  
  try {
    const { getDatabase } = await import('../db');
    const db = getDatabase();
    
    const ruleId = parseInt(req.params.id);
    if (isNaN(ruleId)) {
      throw createError.invalidInput('Invalid rule ID');
    }
    
    const result = db.prepare('DELETE FROM discount_rules WHERE id = ?').run(ruleId);
    
    if (result.changes === 0) {
      throw createError.notFound('Discount rule not found');
    }
    
    requestLogger.info({ 
      ruleId,
      changes: result.changes
    }, 'Discount rule deleted');
    
    res.json({ success: true, changes: result.changes });
  } catch (error: any) {
    if (error instanceof Error && (error.message.includes('Invalid rule ID') || error.message.includes('not found'))) {
      throw error;
    }
    
    const context = {
      requestId: req.requestId,
      operation: 'DELETE_DISCOUNT_RULE',
      resource: `/api/discount-rules/${req.params.id}`
    };
    
    throw createError.databaseError('Failed to delete discount rule', error, context);
  }
}));

export default discountRouter;