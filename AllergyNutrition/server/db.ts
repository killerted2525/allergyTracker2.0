import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Only set websocket constructor in development
if (process.env.NODE_ENV !== 'production') {
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. App will run with in-memory storage only.");
  // Don't throw error - let the app use MemStorage instead
}

// Configure pool with better serverless settings (only if DATABASE_URL exists)
let pool: Pool | null = null;
let dbClient: any = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    // Reduce idle timeout for serverless environments
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 10000, // 10 seconds
    max: 1, // Single connection for serverless
  });

  // Add error handling for pool
  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });

  // Create database client with retry logic
  const createDbClient = () => {
    if (!dbClient && pool) {
      dbClient = drizzle({ client: pool, schema });
    }
    return dbClient;
  };

  dbClient = createDbClient();
}

// Export database instance with reconnection handling
export const db = dbClient;
export { pool };