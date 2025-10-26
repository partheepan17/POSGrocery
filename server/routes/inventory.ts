import express from 'express';
import multer from 'multer';
import { InventoryService } from '../services/inventoryService';
import { requireAuth } from '../middleware/requireAuth';
import { checkPolicy } from '../middleware/checkPolicy';

const upload = multer({ storage: multer.memoryStorage() });

export function createInventoryRoutes(inventoryService: InventoryService, authService: any, policyService: any) {
  const router = express.Router();

  // GET /api/inventory/stock-levels
  router.get('/stock-levels',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.view' }),
    async (req, res) => {
      try {
        const filters = {
          productId: req.query.productId ? parseInt(req.query.productId as string) : undefined,
          lowStock: req.query.lowStock === 'true',
          zeroStock: req.query.zeroStock === 'true',
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
        };

        const stockLevels = await inventoryService.getStockLevels(filters);
        
        res.json({
          success: true,
          data: stockLevels
        });
      } catch (error) {
        console.error('Get stock levels error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get stock levels'
        });
      }
    }
  );

  // POST /api/inventory/adjust
  router.post('/adjust',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.adjust' }),
    async (req, res) => {
      try {
        const { product_id, quantity, reason, notes } = req.body;
        const created_by = req.user!.id;

        if (!product_id || quantity === undefined || !reason) {
          return res.status(400).json({
            success: false,
            message: 'Product ID, quantity, and reason are required'
          });
        }

        const success = await inventoryService.adjustStock({
          product_id,
          quantity,
          reason,
          notes,
          created_by
        });

        if (success) {
          res.json({
            success: true,
            message: 'Stock adjusted successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to adjust stock'
          });
        }
      } catch (error) {
        console.error('Adjust stock error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to adjust stock'
        });
      }
    }
  );

  // GET /api/inventory/movements
  router.get('/movements',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.view' }),
    async (req, res) => {
      try {
        const filters = {
          productId: req.query.productId ? parseInt(req.query.productId as string) : undefined,
          movementType: req.query.movementType as string,
          startDate: req.query.startDate as string,
          endDate: req.query.endDate as string,
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
        };

        const movements = await inventoryService.getInventoryMovements(filters);
        
        res.json({
          success: true,
          data: movements
        });
      } catch (error) {
        console.error('Get inventory movements error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get inventory movements'
        });
      }
    }
  );

  // POST /api/inventory/stocktake/sessions
  router.post('/stocktake/sessions',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.adjust' }),
    async (req, res) => {
      try {
        const { name, notes } = req.body;
        const created_by = req.user!.id;

        if (!name) {
          return res.status(400).json({
            success: false,
            message: 'Session name is required'
          });
        }

        const session = await inventoryService.createStockTakeSession(name, created_by, notes);
        
        res.status(201).json({
          success: true,
          data: session,
          message: 'Stock take session created successfully'
        });
      } catch (error) {
        console.error('Create stock take session error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to create stock take session'
        });
      }
    }
  );

  // GET /api/inventory/stocktake/sessions
  router.get('/stocktake/sessions',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.view' }),
    async (req, res) => {
      try {
        const filters = {
          status: req.query.status as string,
          createdBy: req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined,
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
        };

        const sessions = await inventoryService.getStockTakeSessions(filters);
        
        res.json({
          success: true,
          data: sessions
        });
      } catch (error) {
        console.error('Get stock take sessions error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get stock take sessions'
        });
      }
    }
  );

  // POST /api/inventory/stocktake/sessions/:id/items
  router.post('/stocktake/sessions/:id/items',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.adjust' }),
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.id);
        const { product_id, counted_quantity, notes } = req.body;
        const counted_by = req.user!.id;

        if (!product_id || counted_quantity === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Product ID and counted quantity are required'
          });
        }

        const success = await inventoryService.addStockTakeItem(
          sessionId, 
          product_id, 
          counted_quantity, 
          counted_by, 
          notes
        );

        if (success) {
          res.json({
            success: true,
            message: 'Stock take item added successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to add stock take item'
          });
        }
      } catch (error) {
        console.error('Add stock take item error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to add stock take item'
        });
      }
    }
  );

  // POST /api/inventory/stocktake/sessions/:id/complete
  router.post('/stocktake/sessions/:id/complete',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.adjust' }),
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.id);
        const completed_by = req.user!.id;

        const success = await inventoryService.completeStockTake(sessionId, completed_by);

        if (success) {
          res.json({
            success: true,
            message: 'Stock take completed successfully'
          });
        } else {
          res.status(400).json({
            success: false,
            message: 'Failed to complete stock take'
          });
        }
      } catch (error) {
        console.error('Complete stock take error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to complete stock take'
        });
      }
    }
  );

  // GET /api/inventory/stocktake/sessions/:id/items
  router.get('/stocktake/sessions/:id/items',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.view' }),
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.id);
        const items = await inventoryService.getStockTakeItems(sessionId);
        
        res.json({
          success: true,
          data: items
        });
      } catch (error) {
        console.error('Get stock take items error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to get stock take items'
        });
      }
    }
  );

  // GET /api/inventory/export/stock-levels
  router.get('/export/stock-levels',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.view' }),
    async (req, res) => {
      try {
        const csvData = await inventoryService.exportStockLevels();
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=stock-levels.csv');
        res.send(csvData);
      } catch (error) {
        console.error('Export stock levels error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to export stock levels'
        });
      }
    }
  );

  // POST /api/inventory/import/stock-levels
  router.post('/import/stock-levels',
    requireAuth(authService),
    checkPolicy(policyService, { permission: 'inventory.adjust' }),
    upload.single('file'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: 'CSV file is required'
          });
        }

        const csvData = req.file.buffer.toString('utf-8');
        const created_by = req.user!.id;

        const result = await inventoryService.importStockLevels(csvData, created_by);
        
        res.json({
          success: true,
          data: result,
          message: `Import completed: ${result.success} successful, ${result.errors.length} errors`
        });
      } catch (error) {
        console.error('Import stock levels error:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to import stock levels'
        });
      }
    }
  );

  return router;
}










