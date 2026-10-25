import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { readdirSync, statSync, existsSync, realpathSync, lstatSync } from 'node:fs';
import { resolve, normalize, basename, relative, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

const MAX_DEPTH = 5;
const BUDGET_MS = 30000;

interface Marker {
  name: string;
  enum: string;
}

const KNOWN_MARKERS: Record<string, string> = {
  'package.json': 'package_json',
  'package-lock.json': 'npm_lock',
  'yarn.lock': 'yarn_lock',
  'pnpm-lock.yaml': 'pnpm_lock',
  'Cargo.toml': 'cargo_toml',
  'requirements.txt': 'requirements_txt',
  'Pipfile': 'pipfile',
  'go.mod': 'go_mod',
};

const PROTECTED_NAMES = new Set([
  '.env', '.env.local', '.env.development', '.env.production',
  '.npmrc', '.pypirc', '.git/config',
]);

export async function discoverProjects(rootPath: string, scanId: string, rootId: string): Promise<void> {
  const db = getDb();
  const start = Date.now();
  const rootReal = realpathSync(rootPath);

  const stack: { dir: string; depth: number }[] = [{ dir: rootReal, depth: 0 }];
  let entriesVisited = 0;
  let incomplete = false;

  while (stack.length > 0) {
    const { dir, depth } = stack.pop()!;

    if (Date.now() - start > BUDGET_MS) {
      incomplete = true;
      break;
    }

    if (depth > MAX_DEPTH) continue;
    entriesVisited++;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }

    // Check for project marker at this level
    const markers: Marker[] = [];
    let isProject = false;
    for (const entry of entries) {
      const entryPath = resolve(dir, entry);
      if (KNOWN_MARKERS[entry]) {
        markers.push({ name: entry, enum: KNOWN_MARKERS[entry] });
        isProject = true;
      }
    }

    if (isProject) {
      const projectId = uuid();
      const rel = relative(rootReal, dir);
      const ecosystem = markers.some(m => m.enum.startsWith('npm') || m.enum === 'package_json') ? 'node' : 'unknown';
      db.prepare(
        `INSERT INTO projects (id, root_id, relative_location, ecosystem, status)
         VALUES (?, ?, ?, ?, 'discovered')`
      ).run(projectId, rootId, rel === '' ? '.' : rel, ecosystem);
    }

    // Descend into subdirectories
    if (depth < MAX_DEPTH) {
      for (const entry of entries) {
        const entryPath = resolve(dir, entry);
        if (PROTECTED_NAMES.has(entry)) continue;
        if (entry.startsWith('.git')) continue;

        let st;
        try {
          st = lstatSync(entryPath);
        } catch {
          continue;
        }

        if (st.isSymbolicLink()) continue;
        if (!st.isDirectory()) continue;

        // Skip node_modules
        if (entry === 'node_modules') continue;

        stack.push({ dir: entryPath, depth: depth + 1 });
      }
    }
  }

  db.prepare(
    `UPDATE scans SET end_at = datetime('now'), completeness = ?, errors = ? WHERE id = ?`
  ).run(incomplete ? 'partial' : 'complete', null, scanId);
}

export function getProjects(rootId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM projects WHERE root_id = ?').all(rootId);
}

export function getProject(id: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}

export function updateProject(id: string, data: { pinned?: boolean; userShelved?: boolean }) {
  const db = getDb();
  const sets: string[] = [];
  const vals: any[] = [];

  if (data.pinned !== undefined) {
    sets.push('pinned = ?');
    vals.push(data.pinned ? 1 : 0);
  }
  if (data.userShelved !== undefined) {
    sets.push('user_shelved = ?');
    vals.push(data.userShelved ? 1 : 0);
  }

  if (sets.length === 0) return null;

  vals.push(id);
  db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
}