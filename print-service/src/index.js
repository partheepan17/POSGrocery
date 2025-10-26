/**
 * POS Print Service
 * Lightweight Node.js server for thermal receipt printing
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { printRouter } from './routes/print.js';
import { printerService } from './services/printerService.js';
import { websocketService } from './services/websocketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = process.env.PRINT_PORT || 8251;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8250', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'pos-print-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    printers: printerService.getPrinterCount()
  });
});

// Print routes
app.use('/print', printRouter);

// WebSocket server for real-time printing
const wss = new WebSocketServer({ 
  server,
  path: '/ws/print'
});

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('WebSocket message received:', message.type);
      
      switch (message.type) {
        case 'print_receipt':
          await websocketService.handlePrintReceipt(ws, message.data);
          break;
        case 'list_printers':
          await websocketService.handleListPrinters(ws);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;
        default:
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Unknown message type' 
          }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Initialize printer service
async function initializeServices() {
  try {
    await printerService.initialize();
    console.log('✅ Printer service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize printer service:', error.message);
  }
}

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      console.log('🚀 POS Print Service started');
      console.log(`📡 HTTP Server: http://localhost:${PORT}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws/print`);
      console.log(`🖨️  Printers detected: ${printerService.getPrinterCount()}`);
      console.log('📋 Available endpoints:');
      console.log('   GET  /health - Health check');
      console.log('   GET  /print/printers - List available printers');
      console.log('   POST /print/receipt - Print receipt');
      console.log('   WS   /ws/print - WebSocket for real-time printing');
    });
  } catch (error) {
    console.error('❌ Failed to start print service:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down print service...');
  await printerService.cleanup();
  server.close(() => {
    console.log('✅ Print service stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down print service...');
  await printerService.cleanup();
  server.close(() => {
    console.log('✅ Print service stopped');
    process.exit(0);
  });
});

// Start the server
startServer();











