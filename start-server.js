import express from 'express';
import cors from 'cors';
import { initDatabase } from './dist/db/index.js';

console.log('Starting server...');

try {
  // Initialize database
  console.log('Initializing database...');
  const db = initDatabase();
  console.log('Database initialized successfully');

  // Create Express app
  const app = express();
  
  // Basic middleware
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:8103', 'http://localhost:8104', 'http://localhost:8105'],
    credentials: true
  }));
  
  app.use(express.json());
  
  // Simple health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // Simple products endpoint
  app.get('/api/products', (req, res) => {
    try {
      const products = db.prepare('SELECT * FROM products LIMIT 10').all();
      res.json({ products });
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Database error' });
    }
  });
  
  // Start server
  const PORT = 3001;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Products: http://localhost:${PORT}/api/products`);
  });
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
