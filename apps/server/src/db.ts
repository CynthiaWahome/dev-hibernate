import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH || './data/dev-hibernate.sqlite';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    runMigrations(db);
  }
  return db;
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS roots (
      id TEXT PRIMARY KEY,
      canonical_path TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      root_id TEXT NOT NULL,
      relative_location TEXT NOT NULL,
      ecosystem TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0,
      user_shelved INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'discovered',
      FOREIGN KEY (root_id) REFERENCES roots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      root_id TEXT NOT NULL,
      limits TEXT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT,
      completeness TEXT NOT NULL DEFAULT 'partial',
      errors TEXT,
      FOREIGN KEY (root_id) REFERENCES roots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      relative_target TEXT NOT NULL,
      logical_bytes INTEGER NOT NULL DEFAULT 0,
      entry_count INTEGER NOT NULL DEFAULT 0,
      fingerprint TEXT NOT NULL,
      policy_version INTEGER NOT NULL,
      blockers TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      scan_id TEXT NOT NULL,
      candidate_ids TEXT NOT NULL,
      model_result TEXT,
      policy_version INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'generating',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      selected_ids TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      per_target_results TEXT NOT NULL DEFAULT '{}',
      start_at TEXT NOT NULL,
      end_at TEXT,
      failure_reason TEXT,
      FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS resume_records (
      project_id TEXT PRIMARY KEY,
      detected_markers TEXT NOT NULL,
      suggested_steps TEXT NOT NULL,
      removed_artifacts TEXT NOT NULL,
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  const version = database.prepare('SELECT MAX(version) as v FROM schema_version').get() as { v: number | null };
  const current = version.v ?? 0;
  if (current < 1) {
    database.prepare('INSERT INTO schema_version (version) VALUES (1)').run();
  }
}