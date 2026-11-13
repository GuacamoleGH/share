// =============================================================================
// GuacamoleGH Share — Conector de Base de Datos SQLite Nativo
// Utiliza DatabaseSync de node:sqlite (Node 22+)
// =============================================================================

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');

let dbInstance: any = null;

export function getDbPath(): string {
  if (process.env.DB_PATH) {
    if (process.env.DB_PATH === ':memory:') {
      return ':memory:';
    }
    return path.resolve(process.env.DB_PATH);
  }
  return path.resolve(process.cwd(), 'data', 'share.db');
}

export function getDb(): any {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDbPath();
  if (dbPath !== ':memory:') {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  dbInstance = new DatabaseSync(dbPath);

  // Optimizaciones de concurrencia y fiabilidad para homelab
  dbInstance.exec('PRAGMA journal_mode = WAL;');
  dbInstance.exec('PRAGMA synchronous = NORMAL;');
  dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Aplicar esquema relacional base
  const schemaPath = path.resolve(process.cwd(), 'server', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    dbInstance.exec(schemaSql);
  }

  // Migraciones automáticas: columnas is_ephemeral y last_ping
  try {
    const cols = dbInstance.prepare("PRAGMA table_info(transfers)").all();
    if (cols.length > 0 && !cols.some((c: any) => c.name === 'is_ephemeral')) {
      dbInstance.exec("ALTER TABLE transfers ADD COLUMN is_ephemeral INTEGER NOT NULL DEFAULT 0;");
    }
    if (cols.length > 0 && !cols.some((c: any) => c.name === 'last_ping')) {
      dbInstance.exec("ALTER TABLE transfers ADD COLUMN last_ping TEXT;");
    }
  } catch (err) {
    console.error('[Migration Error transfers]', err);
  }

  return dbInstance;
}

export function closeDb(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}
