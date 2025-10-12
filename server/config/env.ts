import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('8250'),
  DB_PATH: z.string().default('./data/pos-grocery.db'),
  CORS_ORIGINS: z.string().transform((val) => {
    const origins = val.split(',').map(o => o.trim()).filter(Boolean);
    // Ensure Vite dev origins are included (common Vite ports)
    const defaultOrigins = [
      'http://localhost:5173', 
      'http://127.0.0.1:5173',
      'http://localhost:8103',
      'http://127.0.0.1:8103',
      'http://localhost:8104',
      'http://127.0.0.1:8104',
      'http://localhost:8105',
      'http://127.0.0.1:8105'
    ];
    const allOrigins = [...new Set([...defaultOrigins, ...origins])];
    return allOrigins;
  }).default('http://localhost:5173,http://127.0.0.1:5173,http://localhost:8103,http://127.0.0.1:8103,http://localhost:8104,http://127.0.0.1:8104,http://localhost:8105,http://127.0.0.1:8105'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  FAST_DEV: z.string().transform(val => val === 'true').default('false'),
  SKIP_MIGRATIONS: z.string().transform(val => val === 'true').default('false'),
  SKIP_HARDWARE_CHECKS: z.string().transform(val => val === 'true').default('false'),
  
  // Rate limiting configuration
  RATE_LIMIT_RPM: z.string().transform(Number).pipe(z.number().min(1).max(10000)).default('60'),
  RATE_LIMIT_BURST: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000).max(3600000)).default('60000'),
  
  // Body size limits
  JSON_LIMIT_MB: z.string().transform(Number).pipe(z.number().min(0.1).max(100)).default('2'),
  URL_ENCODED_LIMIT_MB: z.string().transform(Number).pipe(z.number().min(0.1).max(100)).default('1'),
  
  // Nginx limits (for reference)
  NGINX_CLIENT_MAX_BODY_SIZE: z.string().default('2m'),
  NGINX_RATE_LIMIT_RPM: z.string().transform(Number).pipe(z.number().min(1).max(10000)).default('60'),
  NGINX_RATE_LIMIT_BURST: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  
  // Build metadata
  APP_NAME: z.string().default('viRtual POS'),
  APP_VERSION: z.string().default('1.0.0'),
  BUILD_SHA: z.string().default('unknown'),
  BUILD_TIME: z.string().default('unknown'),
  
  // Sales system configuration
  RECEIPT_PREFIX: z.string().default('S1'),
  REQUIRE_IDEMPOTENCY_ON_PROD: z.string().transform(val => val === 'true').default('true'),
  
  // Database concurrency settings
  PRAGMA_BUSY_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().min(1000).max(30000)).default('4000'),
  RETRY_MAX_ATTEMPTS: z.string().transform(Number).pipe(z.number().min(1).max(10)).default('5'),
  RETRY_BASE_DELAY_MS: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  RETRY_MAX_DELAY_MS: z.string().transform(Number).pipe(z.number().min(10).max(1000)).default('50'),
  RETRY_JITTER_MS: z.string().transform(Number).pipe(z.number().min(0).max(100)).default('10'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  if (error instanceof z.ZodError) {
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export { env };

