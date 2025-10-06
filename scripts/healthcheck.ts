#!/usr/bin/env tsx
/**
 * Health Check Script
 * Basic HTTP smoke test against running production build
 * 
 * Usage: npm run release:check
 */

import { execSync } from 'child_process';

interface HealthCheckResult {
  url: string;
  status: 'pass' | 'fail';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  details?: string;
}

class HealthChecker {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = 'http://localhost:8080', timeout: number = 10000) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  /**
   * Perform HTTP request with timeout
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'HealthCheck/1.0',
          'Accept': 'text/html,application/json'
        }
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Check if response contains expected content
   */
  private validateResponse(response: Response, text: string): { valid: boolean; details: string } {
    const contentType = response.headers.get('content-type') || '';
    
    // Check for HTML content (main app)
    if (contentType.includes('text/html')) {
      const hasTitle = text.includes('<title>') || text.includes('Grocery POS');
      const hasRootElement = text.includes('<div id="root">') || text.includes('id="app"');
      
      if (hasTitle || hasRootElement) {
        return { valid: true, details: 'HTML page with expected elements found' };
      }
      
      return { valid: false, details: 'HTML page missing expected elements (title or root div)' };
    }
    
    // Check for JSON content (health endpoint)
    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        if (json.status === 'ok' || json.healthy === true) {
          return { valid: true, details: 'Health endpoint returned OK status' };
        }
        return { valid: false, details: 'Health endpoint returned non-OK status' };
      } catch {
        return { valid: false, details: 'Invalid JSON response from health endpoint' };
      }
    }
    
    // For other content types, just check if we got a response
    return { valid: true, details: `Response received (${contentType})` };
  }

  /**
   * Perform health check on a single URL
   */
  private async checkUrl(path: string): Promise<HealthCheckResult> {
    const url = `${this.baseUrl}${path}`;
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Checking ${url}...`);
      
      const response = await this.fetchWithTimeout(url);
      const responseTime = Date.now() - startTime;
      const text = await response.text();
      
      const validation = this.validateResponse(response, text);
      
      if (response.ok && validation.valid) {
        console.log(`   ✅ ${response.status} (${responseTime}ms) - ${validation.details}`);
        return {
          url,
          status: 'pass',
          statusCode: response.status,
          responseTime,
          details: validation.details
        };
      } else {
        const reason = !response.ok 
          ? `HTTP ${response.status} ${response.statusText}`
          : validation.details;
        
        console.log(`   ❌ ${response.status} (${responseTime}ms) - ${reason}`);
        return {
          url,
          status: 'fail',
          statusCode: response.status,
          responseTime,
          error: reason
        };
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`   ❌ Failed (${responseTime}ms) - ${errorMessage}`);
      return {
        url,
        status: 'fail',
        responseTime,
        error: errorMessage
      };
    }
  }

  /**
   * Check if server is running on the expected port
   */
  private async checkServerRunning(): Promise<boolean> {
    try {
      // Extract port from base URL
      const urlObj = new URL(this.baseUrl);
      const port = urlObj.port || (urlObj.protocol === 'https:' ? '443' : '80');
      
      console.log(`🔌 Checking if server is running on port ${port}...`);
      
      // Try a simple connection test
      const response = await this.fetchWithTimeout(this.baseUrl);
      console.log(`   ✅ Server is responding`);
      return true;
      
    } catch (error) {
      console.log(`   ❌ Server not responding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`\n💡 Make sure the server is running:`);
      console.log(`   npm run build:prod && npm run serve:prod`);
      console.log(`   or`);
      console.log(`   npm run docker:run`);
      return false;
    }
  }

  /**
   * Run comprehensive health checks
   */
  async runHealthChecks(): Promise<{ passed: number; failed: number; results: HealthCheckResult[] }> {
    console.log('🏥 Starting health checks...\n');
    
    // Check if server is running first
    const serverRunning = await this.checkServerRunning();
    if (!serverRunning) {
      return { passed: 0, failed: 1, results: [] };
    }
    
    console.log('');
    
    // Define endpoints to check
    const endpoints = [
      '/',           // Main application
      '/health',     // Health endpoint (if exists)
      '/products',   // SPA route
      '/sales',      // SPA route
      '/settings'    // SPA route
    ];
    
    const results: HealthCheckResult[] = [];
    
    // Check each endpoint
    for (const endpoint of endpoints) {
      const result = await this.checkUrl(endpoint);
      results.push(result);
    }
    
    // Calculate summary
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    
    return { passed, failed, results };
  }

  /**
   * Print summary report
   */
  printSummary(passed: number, failed: number, results: HealthCheckResult[]): void {
    console.log('\n📊 Health Check Summary');
    console.log('========================');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total:  ${passed + failed}`);
    
    if (failed > 0) {
      console.log('\n🚨 Failed Checks:');
      results
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`   • ${r.url}: ${r.error}`);
        });
    }
    
    // Performance summary
    const avgResponseTime = results
      .filter(r => r.responseTime !== undefined)
      .reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
    
    if (avgResponseTime > 0) {
      console.log(`\n⚡ Average Response Time: ${Math.round(avgResponseTime)}ms`);
      
      if (avgResponseTime > 3000) {
        console.log('⚠️  Warning: Average response time is over 3 seconds');
      }
    }
  }

  /**
   * Check system resources and dependencies
   */
  async checkSystemHealth(): Promise<void> {
    console.log('\n🔧 System Health Checks');
    console.log('========================');
    
    try {
      // Check if Node.js version is adequate
      const nodeVersion = process.version;
      console.log(`📦 Node.js: ${nodeVersion}`);
      
      // Check available memory
      const memUsage = process.memoryUsage();
      const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
      console.log(`🧠 Memory: ${memUsedMB}MB / ${memTotalMB}MB`);
      
      // Check if git is available (for version info)
      try {
        const gitCommit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
        console.log(`🌿 Git Commit: ${gitCommit}`);
      } catch {
        console.log('🌿 Git: Not available');
      }
      
      // Check if Docker is available (if using Docker deployment)
      try {
        const dockerVersion = execSync('docker --version', { encoding: 'utf-8' }).trim();
        console.log(`🐳 Docker: ${dockerVersion.split(',')[0]}`);
      } catch {
        console.log('🐳 Docker: Not available');
      }
      
    } catch (error) {
      console.log(`❌ System check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let baseUrl = 'http://localhost:8080';
  let timeout = 10000;
  let verbose = false;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && args[i + 1]) {
      baseUrl = args[i + 1];
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      verbose = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log('Health Check Script');
      console.log('');
      console.log('Usage: npm run release:check [options]');
      console.log('');
      console.log('Options:');
      console.log('  --url <url>      Base URL to check (default: http://localhost:8080)');
      console.log('  --timeout <ms>   Request timeout in milliseconds (default: 10000)');
      console.log('  --verbose, -v    Show detailed system information');
      console.log('  --help, -h       Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  npm run release:check');
      console.log('  npm run release:check -- --url http://localhost:3000');
      console.log('  npm run release:check -- --verbose');
      return;
    }
  }
  
  const healthChecker = new HealthChecker(baseUrl, timeout);
  
  try {
    // Run health checks
    const { passed, failed, results } = await healthChecker.runHealthChecks();
    
    // Print summary
    healthChecker.printSummary(passed, failed, results);
    
    // Show system health if verbose
    if (verbose) {
      await healthChecker.checkSystemHealth();
    }
    
    // Exit with appropriate code
    if (failed > 0) {
      console.log('\n❌ Health check failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All health checks passed!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n💥 Health check crashed:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { HealthChecker };








