import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { existsSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve, normalize, join } from 'node:path';

export const rootsRouter = Router();

const BLOCKED_PREFIXES = [
  '/',
  '/System',
  '/Library',
  '/dev',
  '/Volumes',
  '/private/var',
  '/private/etc',
  '/private/root',
];

function isBlockedPath(p: string): boolean {
  const real = realpathSync(p);
  if (real === homedir() || real === '/') return true;
  if (real.startsWith('/System/') || real.startsWith('/Library/') ||
      real.startsWith('/dev/') || real.startsWith('/Volumes/')) return true;
  if (real.startsWith('/private/var/') || real.startsWith('/private/etc/') ||
      real.startsWith('/private/root/')) return true;
  return false;
}

rootsRouter.post('/', (req, res) => {
  const { path } = req.body;
  if (!path || typeof path !== 'string') {
    res.status(400).json({ error: 'path_required' });
    return;
  }

  // Accept a leading ~ and tolerate pasted whitespace before validating.
  let input = path.trim();
  if (input === '~') input = homedir();
  else if (input.startsWith('~/')) input = join(homedir(), input.slice(2));

  const normalized = normalize(input);
  if (!existsSync(normalized) || !statSync(normalized).isDirectory()) {
    res.status(400).json({ error: 'invalid_path' });
    return;
  }

  if (isBlockedPath(normalized)) {
    res.status(403).json({ error: 'path_blocked' });
    return;
  }

  const db = getDb();

  // Return existing root if path already registered
  const existing = db.prepare('SELECT * FROM roots WHERE canonical_path = ?').get(normalized) as any;
  if (existing) {
    res.json(existing);
    return;
  }

  const id = uuid();
  db.prepare('INSERT INTO roots (id, canonical_path) VALUES (?, ?)').run(id, normalized);
  res.json({ id, canonical_path: normalized });
});

rootsRouter.get('/', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM roots').all();
  res.json(rows);
});