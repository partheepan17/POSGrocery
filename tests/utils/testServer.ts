/**
 * Test Server Utility
 * Creates a test server for API contract tests
 */

import { createServer } from 'http';
import { parse } from 'url';

export async function createTestServer() {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    const path = parsedUrl.pathname;
    const method = req.method;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Health endpoint
    if (path === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          ok: true,
          ts: new Date().toISOString()
        }
      }));
      return;
    }

    // Products endpoint
    if (path === '/api/products') {
      const page = parseInt(parsedUrl.query?.page as string) || 1;
      const pageSize = Math.min(parseInt(parsedUrl.query?.pageSize as string) || 10, 200);
      const total = 100; // Mock total
      
      // Handle large page numbers - return empty results
      let products = [];
      if (page <= Math.ceil(total / pageSize)) {
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, total);
        products = Array.from({ length: endIndex - startIndex }).map((_, i) => ({
          id: startIndex + i + 1,
          sku: `PROD${startIndex + i + 1}`,
          name_en: `Product Name ${startIndex + i + 1}`,
          price_retail: 100.00,
          is_active: true,
        }));
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          items: products,
        },
        meta: {
          page,
          pageSize,
          total,
          pages: Math.ceil(total / pageSize),
        }
      }));
      return;
    }

    // Invalid product ID
    if (path?.startsWith('/api/products/') && path !== '/api/products') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        error: 'Product not found'
      }));
      return;
    }

    // Settings endpoint (requires auth)
    if (path === '/api/settings') {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          error: 'Unauthorized'
        }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        data: { setting: 'value' }
      }));
      return;
    }

    // Other endpoints
    if (path === '/api/customers') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: [] }));
      return;
    }

    if (path === '/api/suppliers') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: [] }));
      return;
    }

    if (path === '/api/categories') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: [] }));
      return;
    }

    if (path === '/api/discount-rules') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: [] }));
      return;
    }

    if (path === '/api/discount-rules/effective') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: [] }));
      return;
    }

    if (path === '/api/admin/features/toggle') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, message: 'Feature toggled successfully' }));
      return;
    }

    if (path === '/api/admin/features/dependencies') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        data: {
          cascadeInfo: {
            blockingDependents: [],
            cascadeTargets: [],
          },
        },
      }));
      return;
    }

    // Default 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: false,
      error: 'Not found'
    }));
  });

  return new Promise<{ server: any; baseUrl: string }>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 3000;
      resolve({
        server,
        baseUrl: `http://localhost:${port}`
      });
    });
  });
}