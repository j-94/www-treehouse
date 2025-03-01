import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { dispensaries } from './schema';
import { sql } from 'drizzle-orm';

// Disable WebSocket pooling since it's not supported in serverless environments
neonConfig.fetchConnectionCache = false;

// Create database connection if NEON_DATABASE_URL is available
const createNeonConnection = () => {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl) {
    console.warn('NEON_DATABASE_URL is not set. Neon database will not be used.');
    return null;
  }
  
  try {
    const sql = neon(databaseUrl);
    const db = drizzle(sql);
    return db;
  } catch (error) {
    console.error('Failed to create Neon database connection:', error);
    return null;
  }
};

// Singleton for Neon DB connection
let neonDb: ReturnType<typeof drizzle> | null = null;

export function getNeonDb() {
  if (!neonDb) {
    neonDb = createNeonConnection();
  }
  return neonDb;
}

// Function to initialize Neon database schema
export async function initializeNeonDb() {
  const db = getNeonDb();
  if (!db) {
    console.warn('Cannot initialize Neon database: No connection available');
    return false;
  }

  try {
    // Create dispensaries table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dispensaries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        address TEXT,
        phone_number TEXT,
        website TEXT,
        rating REAL,
        user_ratings_total INTEGER,
        latitude REAL,
        longitude REAL,
        image_url TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `);
    
    console.log('Neon database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Neon database schema:', error);
    return false;
  }
}

// Function to test Neon database connection
export async function testNeonConnection() {
  const db = getNeonDb();
  if (!db) {
    return { success: false, message: 'No Neon database connection available' };
  }

  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    return { 
      success: true, 
      message: 'Neon database connection successful', 
      data: result 
    };
  } catch (error) {
    console.error('Failed to test Neon database connection:', error);
    return { 
      success: false, 
      message: `Neon database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}