import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, sqlite } from './connection.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations() {
  migrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') });
  console.log('Migrations complete');
}

// Automatically run if executed directly
if (process.argv[1].endsWith('migrate.ts')) {
  runMigrations();
  sqlite.close();
}
