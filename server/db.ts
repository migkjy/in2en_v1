import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Enable WebSocket for both development and production
neonConfig.webSocketConstructor = ws;

// Use the same DATABASE_URL for both development and production
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is required. Please set it in your deployment settings.",
  );
}

// Create a single pool that will be used in both environments
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Add connection pool settings for better performance
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Export the database instance with schema
export const db = drizzle({ client: pool, schema });