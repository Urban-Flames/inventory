// lib/db.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// If you're using the neon serverless driver
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

// For raw SQL queries (if you prefer using sql template literal)
export { sql };