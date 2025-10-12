// Direct server start bypassing migration issues
const express = require('express');
const cors = require('cors');
const path = require('path');

// Create a simple test server
const app = express();
const PORT = 8250;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8103', 'http://localhost:8104'],
  credentials: true
}));
app.use(express.json());

// Simple health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Simple GRN endpoint for testing
app.post('/api/purchasing/grn', (req, res) => {
  console.log('GRN request received:', req.body);
  
  // Simple response
  res.json({
    ok: true,
    grn: {
      id: 1,
      grn_number: `TEST-${Date.now()}`,
      status: 'draft',
      total_quantity: req.body.lines?.length || 0,
      total_value: req.body.lines?.reduce((sum, line) => sum + (line.quantity_received * line.unit_cost), 0) || 0
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
