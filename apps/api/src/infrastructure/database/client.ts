import { createClient, type Client } from '@libsql/client';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

let dbInstance: Client | null = null;

export function getDbClient(): Client {
  if (dbInstance) return dbInstance;

  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    dbInstance = createClient({
      url: tursoUrl,
      authToken: tursoToken,
    });
  } else {
    // Local SQLite fallback
    const dbPath = process.env.SQLITE_PATH || resolve(process.cwd(), 'data/llenoporfa.db');
    const dbDir = dirname(dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    dbInstance = createClient({
      url: `file:${dbPath}`,
    });
  }

  return dbInstance;
}

export async function initDatabase(client = getDbClient()): Promise<void> {
  const currentDir = typeof import.meta.dir !== 'undefined' ? import.meta.dir : __dirname;
  const schemaPath = resolve(currentDir, 'schema.sql');
  const schemaSql = readFileSync(schemaPath, 'utf8');

  // Strip line comments (-- ...) and split by semicolon
  const cleanSql = schemaSql.replace(/--.*$/gm, '');
  const statements = cleanSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await client.execute(statement);
  }
}
