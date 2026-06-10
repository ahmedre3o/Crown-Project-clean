#!/usr/bin/env npx ts-node
/**
 * Run production-safe migrations.
 * Usage: cd backend && npx ts-node scripts/run-migrations.ts
 * Requires: DB_* env vars (from .env or environment)
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '../.env') });

const MIGRATIONS = [
  'production-safe-migrations-on-account-paid-fields.sql',
  'production-safe-migrations-expenses-updated-by.sql',
  'production-safe-migrations-tax-accounting.sql',
];

async function main() {
  const dbName = process.env.DB_NAME || 'crown_services_dev';
  const config: mysql.ConnectionOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    multipleStatements: true,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };

  console.log('[migrations] Connecting to', config.host, 'database', dbName);
  const conn = await mysql.createConnection(config);

  try {
    for (const file of MIGRATIONS) {
      const filePath = path.join(__dirname, '../sql', file);
      if (!fs.existsSync(filePath)) {
        console.warn('[migrations] Skip (not found):', file);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log('[migrations] Running:', file);
      await conn.query(sql);
      console.log('[migrations] OK:', file);
    }
    console.log('[migrations] All done.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('[migrations] Error:', err.message);
  process.exit(1);
});
