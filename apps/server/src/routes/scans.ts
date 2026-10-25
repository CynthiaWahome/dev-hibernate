import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db.js';
import { discoverProjects } from '../scanner/discover.js';
import { readdirSync, statSync, existsSync, realpathSync } from 'node:fs';
import { resolve, normalize, basename, relative } from 'node:path';
import { homedir } from 'node:os';

export const scansRouter = Router();

scansRouter.post('/', async (req, res) => {
  const { rootId } = req.body;
  if (!rootId) {
    res.status(400).json({ error: 'rootId_required' });
    return;
  }

  const db = getDb();
  const root = db.prepare('SELECT * FROM roots WHERE id = ?').get(rootId) as any;
  if (!root) {
    res.status(404).json({ error: 'root_not_found' });
    return;
  }

  const scanId = uuid();
  db.prepare(`INSERT INTO scans (id, root_id, limits, start_at) VALUES (?, ?, ?, datetime('now'))`)
    .run(scanId, rootId, JSON.stringify({ depth: 5, budgetMs: 30000 }));

  // Run discovery asynchronously
  discoverProjects(root.canonical_path, scanId, rootId).catch(err => {
    db.prepare('UPDATE scans SET errors = ? WHERE id = ?').run(JSON.stringify(String(err)), scanId);
  });

  res.json({ scanId, status: 'queued' });
});

scansRouter.get('/:id', (req, res) => {
  const db = getDb();
  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(req.params.id) as any;
  if (!scan) {
    res.status(404).json({ error: 'scan_not_found' });
    return;
  }
  const projects = db.prepare('SELECT * FROM projects WHERE root_id = ?').all(scan.root_id);
  res.json({ ...scan, projects });
});