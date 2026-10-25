import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { readdirSync, lstatSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';

const PROTECTED_NAMES = new Set([
  '.env', '.env.local', '.env.development', '.env.production',
  '.npmrc', '.pypirc',
]);

const POLICY_VERSION = 1;

interface Blocker {
  code: string;
  message: string;
}

export async function inventoryCandidate(projectId: string, candidatePath: string): Promise<string[]> {
  const db = getDb();
  const blockers: Blocker[] = [];
  const candidateId = uuid();

  let st;
  try {
    st = lstatSync(candidatePath);
  } catch {
    blockers.push({ code: 'unreadable', message: 'Candidate path is not accessible' });
    saveCandidate(db, candidateId, projectId, candidatePath, 0, 0, '', blockers);
    return [candidateId];
  }

  if (st.isSymbolicLink()) {
    blockers.push({ code: 'symlink', message: 'Candidate is a symbolic link' });
    saveCandidate(db, candidateId, projectId, candidatePath, 0, 0, '', blockers);
    return [candidateId];
  }

  if (!st.isDirectory()) {
    blockers.push({ code: 'not_directory', message: 'Candidate is not a directory' });
    saveCandidate(db, candidateId, projectId, candidatePath, 0, 0, '', blockers);
    return [candidateId];
  }

  let logicalBytes = 0;
  let entryCount = 0;
  const fingerprintParts: string[] = [];
  const maxEntries = 250000;
  const stack: string[] = [candidatePath];
  const start = Date.now();
  let timedOut = false;

  while (stack.length > 0) {
    if (Date.now() - start > 120000 || entryCount > maxEntries) {
      timedOut = true;
      break;
    }

    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      blockers.push({ code: 'unreadable_subtree', message: `Cannot read: ${relative(candidatePath, dir)}` });
      continue;
    }

    for (const entry of entries) {
      const entryPath = resolve(dir, entry);
      let est;
      try {
        est = lstatSync(entryPath);
      } catch {
        continue;
      }

      if (est.isSymbolicLink()) {
        blockers.push({ code: 'nested_symlink', message: `Symlink inside candidate: ${relative(candidatePath, entryPath)}` });
        continue;
      }

      if (PROTECTED_NAMES.has(entry) || entry.startsWith('.env')) {
        blockers.push({ code: 'protected_entry', message: `Protected entry inside candidate: ${relative(candidatePath, entryPath)}` });
        continue;
      }

      entryCount++;
      logicalBytes += est.size;
      fingerprintParts.push(`${entry}:${est.size}:${est.mtimeMs}`);

      if (est.isDirectory() && entryCount < maxEntries) {
        stack.push(entryPath);
      }
    }
  }

  if (timedOut) {
    blockers.push({ code: 'budget_exceeded', message: 'Inventory budget exceeded' });
  }

  const fingerprint = createHash('sha256')
    .update(fingerprintParts.join('|'))
    .digest('hex')
    .slice(0, 64);

  saveCandidate(db, candidateId, projectId, candidatePath, logicalBytes, entryCount, fingerprint, blockers);
  return [candidateId];
}

function saveCandidate(db: any, id: string, projectId: string, relativeTarget: string, logicalBytes: number, entryCount: number, fingerprint: string, blockers: Blocker[]): void {
  db.prepare(
    `INSERT INTO candidates (id, project_id, kind, relative_target, logical_bytes, entry_count, fingerprint, policy_version, blockers)
     VALUES (?, ?, 'node_modules', ?, ?, ?, ?, ?, ?)`
  ).run(id, projectId, relativeTarget, logicalBytes, entryCount, fingerprint, POLICY_VERSION, JSON.stringify(blockers));
}

export function getCandidates(projectId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM candidates WHERE project_id = ?').all(projectId);
}

export function isPolicyEligible(candidate: any): boolean {
  const blockers: Blocker[] = JSON.parse(candidate.blockers || '[]');
  return blockers.length === 0;
}