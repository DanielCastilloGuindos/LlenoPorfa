import { createClient } from '@libsql/client';
import type { Client } from '@libsql/core/api';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let dbInstance: Client | null = null;
let schemaInitialization: { client: Client; promise: Promise<void> } | null = null;

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
    if (process.env.VERCEL) {
      throw new Error('TURSO_DATABASE_URL must be configured in Vercel; local SQLite is not persistent in serverless functions.');
    }

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
  const existingInitialization = schemaInitialization;
  if (existingInitialization?.client === client) {
    return existingInitialization.promise;
  }

  const initialization = initializeSchema(client);
  schemaInitialization = { client, promise: initialization };

  try {
    await initialization;
  } catch (error) {
    if (schemaInitialization?.promise === initialization) {
      schemaInitialization = null;
    }
    throw error;
  }
}

async function initializeSchema(client: Client): Promise<void> {
  // `import.meta.dir` and `__dirname` are runtime-specific. Resolving from
  // import.meta.url works in Bun locally and in Vercel's Node runtime. The
  // process.cwd fallback covers Vercel's bundled function layout.
  const schemaCandidates = [
    fileURLToPath(new URL('./schema.sql', import.meta.url)),
    resolve(process.cwd(), 'apps/api/src/infrastructure/database/schema.sql'),
    resolve(process.cwd(), 'src/infrastructure/database/schema.sql'),
  ];
  const schemaPath = schemaCandidates.find((candidate) => existsSync(candidate));
  if (!schemaPath) {
    throw new Error(`Database schema file not found. Checked: ${schemaCandidates.join(', ')}`);
  }
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
