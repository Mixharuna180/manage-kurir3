import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Gunakan driver PostgreSQL standar, bukan Neon WebSocket
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false // Matikan SSL untuk koneksi lokal
});

export const db = drizzle(pool, { schema });
