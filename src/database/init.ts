import { db } from '../services/database';

export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🚀 Initializing database...');
    
    // Initialize database service
    await db.initialize();
    
    // Run migrations
    console.log('📦 Running migrations...');
    await db.runMigrations();
    
    // Run seeds
    console.log('🌱 Running seeds...');
    await db.runSeeds();
    
    console.log('✅ Database initialization completed successfully!');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Auto-initialize when this module is imported
initializeDatabase().catch(console.error);




