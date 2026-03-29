import Database, { type Database as DBType } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sqlite: DBType = new Database(path.join(dbDir, 'agent.db'));
export const db = drizzle(sqlite, { schema });

// Ejecutar migraciones al inicio
const migrationsPath = path.resolve(__dirname, '../../drizzle');
migrate(db, { migrationsFolder: migrationsPath });

export function getDb() {
  return db;
}

export function closeDb() {
  sqlite.close();
}
