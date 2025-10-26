/**
 * WebSocket Service
 * Handles real-time printing communication via WebSocket
 */

import { printerService } from './printerService.js';

export class WebSocketService {
  constructor() {
    this.connections = new Set();
  }

  addConnection(ws) {
    this.connections.add(ws);
    console.log(`🔌 WebSocket connection added. Total: ${this.connections.size}`);
  }

  removeConnection(ws) {
    this.connections.delete(ws);
    console.log(`🔌 WebSocket connection removed. Total: ${this.connections.size}`);
  }

  async handlePrintReceipt(ws, data) {
    try {
      const { printerId, templateHtml, lines, options = {} } = data;
      
      if (!printerId) {
        ws.send(JSON.stringify({
          type: 'print_error',
          error: 'Printer ID is required'
        }));
        return;
      }

      // Send print started notification
      ws.send(JSON.stringify({
        type: 'print_started',
        printerId,
        timestamp: new Date().toISOString()
      }));

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

      // Send success notification
      ws.send(JSON.stringify({
        type: 'print_success',
        result,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('WebSocket print error:', error);
      ws.send(JSON.stringify({
        type: 'print_error',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  }

  async handleListPrinters(ws) {
    try {
      const printers = printerService.getPrinters();
      
      ws.send(JSON.stringify({
        type: 'printers_list',
        printers,
        count: printers.length,
        timestamp: new Date().toISOString()
      }));

    } catch (error) {
      console.error('WebSocket list printers error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  }

  async broadcastPrintersUpdate() {
    const printers = printerService.getPrinters();
    const message = JSON.stringify({
      type: 'printers_updated',
      printers,
      count: printers.length,
      timestamp: new Date().toISOString()
    });

    this.connections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }

  async broadcastPrintStatus(printerId, status, details = {}) {
    const message = JSON.stringify({
      type: 'printer_status',
      printerId,
      status,
      details,
      timestamp: new Date().toISOString()
    });

    this.connections.forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }
}

export const websocketService = new WebSocketService();











