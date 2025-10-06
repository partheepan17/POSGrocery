import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { api } from './routes';

const app = express();
const PORT = Number(process.env.PORT || 8250);

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', port: PORT, time: new Date().toISOString() });
});

// API endpoints used by the frontend
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    server: {
      platform: process.platform,
      node_version: process.version,
      uptime: process.uptime()
    },
    database: { connected: true, type: 'memory' },
    printer: { installed: false, default: '', name: '', available: false },
    environment: {
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: String(PORT)
    }
  });
});

app.get('/api/customers', (req, res) => {
  const active = req.query.active;
  res.json({ customers: [], total: 0, active: active === 'true' });
});

// Mount real API routes
app.use('/api', api);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


