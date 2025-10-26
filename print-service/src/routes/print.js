/**
 * Print Routes
 * HTTP API endpoints for printing operations
 */

import express from 'express';
import { printerService } from '../services/printerService.js';
import { websocketService } from '../services/websocketService.js';

export const printRouter = express.Router();

// GET /print/printers - List available printers
printRouter.get('/printers', async (req, res) => {
  try {
    const printers = printerService.getPrinters();
    
    res.json({
      success: true,
      printers,
      count: printers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('List printers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list printers',
      message: error.message
    });
  }
});

// GET /print/printers/:id - Get specific printer details
printRouter.get('/printers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const printer = printerService.getPrinter(id);
    
    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found',
        printerId: id
      });
    }
    
    res.json({
      success: true,
      printer,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get printer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get printer',
      message: error.message
    });
  }
});

// POST /print/receipt - Print a receipt
printRouter.post('/receipt', async (req, res) => {
  try {
    const { printerId, templateHtml, lines, options = {} } = req.body;
    
    // Validate required fields
    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'Printer ID is required'
      });
    }
    
    if (!templateHtml && (!lines || !Array.isArray(lines))) {
      return res.status(400).json({
        success: false,
        error: 'Either templateHtml or lines array is required'
      });
    }
    
    // Check if printer exists
    const printer = printerService.getPrinter(printerId);
    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found',
        printerId
      });
    }
    
    // Prepare receipt data
    const receiptData = {
      type: 'receipt',
      templateHtml,
      lines,
      options,
      timestamp: new Date().toISOString()
    };
    
    // Print the receipt
    const result = await printerService.printReceipt(printerId, receiptData);
    
    // Broadcast to WebSocket clients
    await websocketService.broadcastPrintStatus(printerId, 'completed', result);
    
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Print receipt error:', error);
    
    // Broadcast error to WebSocket clients
    if (req.body.printerId) {
      await websocketService.broadcastPrintStatus(req.body.printerId, 'error', {
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to print receipt',
      message: error.message
    });
  }
});

// POST /print/test/:printerId - Test a specific printer
printRouter.post('/test/:printerId', async (req, res) => {
  try {
    const { printerId } = req.params;
    
    const result = await printerService.testPrinter(printerId);
    
    // Broadcast test result to WebSocket clients
    await websocketService.broadcastPrintStatus(printerId, 'test_completed', result);
    
    res.json({
      success: true,
      result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test printer error:', error);
    
    // Broadcast error to WebSocket clients
    await websocketService.broadcastPrintStatus(req.params.printerId, 'test_error', {
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to test printer',
      message: error.message
    });
  }
});

// POST /print/refresh - Refresh printer list
printRouter.post('/refresh', async (req, res) => {
  try {
    await printerService.initialize();
    const printers = printerService.getPrinters();
    
    // Broadcast updated printer list to WebSocket clients
    await websocketService.broadcastPrintersUpdate();
    
    res.json({
      success: true,
      printers,
      count: printers.length,
      message: 'Printer list refreshed',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Refresh printers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh printers',
      message: error.message
    });
  }
});

// GET /print/status - Get print service status
printRouter.get('/status', async (req, res) => {
  try {
    const printers = printerService.getPrinters();
    const activeConnections = websocketService.connections.size;
    
    res.json({
      success: true,
      status: 'running',
      printers: {
        total: printers.length,
        available: printers.filter(p => p.status === 'available').length,
        list: printers
      },
      websocket: {
        activeConnections
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Get status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      message: error.message
    });
  }
});











