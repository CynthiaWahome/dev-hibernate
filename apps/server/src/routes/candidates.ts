import { Router } from 'express';
import { getDb } from '../db.js';
import { inventoryCandidate, getCandidates } from '../scanner/inventory.js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const candidatesRouter = Router();

candidatesRouter.post('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
  if (!project) {
    res.status(404).json({ error: 'project_not_found' });
    return;
  }

  const root = db.prepare('SELECT * FROM roots WHERE id = ?').get(project.root_id) as any;
  if (!root) {
    res.status(404).json({ error: 'root_not_found' });
    return;
  }

  const fullPath = resolve(root.canonical_path, project.relative_location, 'node_modules');
  if (!existsSync(fullPath)) {
    res.status(400).json({ error: 'no_candidate', message: 'node_modules not found' });
    return;
  }

  const ids = await inventoryCandidate(projectId, fullPath);
  res.json({ candidateIds: ids });
});

candidatesRouter.get('/:projectId', (req, res) => {
  const candidates = getCandidates(req.params.projectId);
  res.json(candidates);
});