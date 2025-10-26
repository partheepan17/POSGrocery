/**
 * Working Server with Enhanced Features
 * Minimal Express server with enhanced features system
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    features: 'enhanced'
  });
});

// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({ 
    message: 'POS Grocery API with Enhanced Features is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: {
      rbac: true,
      realtime: true,
      audit: true,
      telemetry: true,
      configuration: true
    }
  });
});

// Enhanced Features API
app.get('/api/meta/features', (req, res) => {
  // Mock features data
  res.json({
    enabled: {
      'sales': true,
      'inventory': true,
      'returns': true,
      'grn': true,
      'reports': true,
      'settings': true,
      'feature_flags_console': true
    },
    permissions: {
      'sales.create': true,
      'sales.read': true,
      'inventory.read': true,
      'inventory.write': true,
      'returns.create': true,
      'returns.read': true,
      'grn.create': true,
      'grn.read': true,
      'reports.read': true,
      'settings.write': true,
      'feature.toggle': true
    },
    dependencies: {
      'returns': ['sales'],
      'grn': ['inventory'],
      'reports': ['sales', 'inventory']
    }
  });
});

// Feature toggle endpoint
app.post('/api/admin/features/toggle', (req, res) => {
  const { featureCode, isEnabled, cascade } = req.body;
  
  console.log(`Feature toggle: ${featureCode} -> ${isEnabled}${cascade ? ' (cascade)' : ''}`);
  
  res.json({
    success: true,
    featureCode,
    isEnabled,
    cascade: cascade || false,
    timestamp: new Date().toISOString()
  });
});

// Role override endpoint
app.post('/api/admin/features/override', (req, res) => {
  const { roleId, featureCode, isEnabled } = req.body;
  
  console.log(`Role override: ${roleId} -> ${featureCode} = ${isEnabled}`);
  
  res.json({
    success: true,
    roleId,
    featureCode,
    isEnabled,
    timestamp: new Date().toISOString()
  });
});

// Configuration export
app.get('/api/admin/configuration/export', (req, res) => {
  const config = {
    tenantId: 'test-tenant-1',
    features: {
      'sales': { isEnabled: true, isCore: true },
      'inventory': { isEnabled: true, isCore: true },
      'returns': { isEnabled: true, isCore: false },
      'grn': { isEnabled: true, isCore: false },
      'reports': { isEnabled: true, isCore: false }
    },
    roles: {
      'admin': { permissions: ['*'] },
      'manager': { permissions: ['sales.*', 'inventory.*', 'reports.*'] },
      'cashier': { permissions: ['sales.*'] }
    },
    exportedAt: new Date().toISOString()
  };
  
  res.json(config);
});

// Configuration import
app.post('/api/admin/configuration/import', (req, res) => {
  const { config } = req.body;
  
  console.log('Configuration imported:', config);
  
  res.json({
    success: true,
    message: 'Configuration imported successfully',
    importedAt: new Date().toISOString()
  });
});

// Telemetry endpoint
app.post('/api/telemetry/feature-usage', (req, res) => {
  const { featureCode, eventType, metadata } = req.body;
  
  console.log(`Telemetry: ${featureCode} - ${eventType}`, metadata);
  
  res.json({
    success: true,
    tracked: true,
    timestamp: new Date().toISOString()
  });
});

// Audit trail endpoint
app.get('/api/admin/audit', (req, res) => {
  const { page = 1, limit = 10, featureCode, action } = req.query;
  
  const mockAudit = [
    {
      id: 1,
      action: 'feature.toggle',
      entity: 'feature',
      entityId: 'returns',
      actor: 'admin',
      timestamp: new Date().toISOString(),
      changes: {
        before: { isEnabled: false },
        after: { isEnabled: true }
      }
    },
    {
      id: 2,
      action: 'role.override',
      entity: 'role',
      entityId: 'cashier',
      actor: 'admin',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      changes: {
        before: { 'returns': false },
        after: { 'returns': true }
      }
    }
  ];
  
  res.json({
    data: mockAudit,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: mockAudit.length,
      pages: 1
    }
  });
});

// Realtime SSE endpoint
app.get('/api/realtime/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Send periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Enhanced Features Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API status: http://localhost:${PORT}/api/status`);
  console.log(`🎯 Frontend: http://localhost:${PORT}`);
  console.log(`🔧 Features API: http://localhost:${PORT}/api/meta/features`);
  console.log(`📡 Realtime: http://localhost:${PORT}/api/realtime/events`);
});

module.exports = app;










