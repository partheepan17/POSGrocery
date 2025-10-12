const express = require('express');
const app = express();

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ ok: true, message: 'Test endpoint working' });
});

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    build: {
      name: 'viRtual POS',
      version: '1.0.0',
      buildSha: 'dev-20251011-213030',
      buildTime: '2025-10-11T21:30:30Z'
    }
  });
});

const PORT = 8250;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

