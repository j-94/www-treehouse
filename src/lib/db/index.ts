import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

// Create a persistent SQLite database
const sqlite = new Database("dispensaries.db");

// Create a Drizzle instance
export const db = drizzle(sqlite, { schema });

// Initialize database tables
export function initializeDatabase() {
  // Create tables
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS dispensaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      image_url TEXT,
      description TEXT,
      rating REAL,
      review_count INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      thumbhash TEXT
    );
  `);
} 