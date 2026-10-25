import { Router } from 'express';
import { getDb } from '../db.js';
import { getProjects, getProject, updateProject } from '../scanner/discover.js';

export const projectsRouter = Router();

projectsRouter.get('/', (req, res) => {
  const rootId = req.query.rootId as string;
  const db = getDb();
  let rows;
  if (rootId) {
    rows = db.prepare('SELECT * FROM projects WHERE root_id = ?').all(rootId);
  } else {
    rows = db.prepare('SELECT * FROM projects').all();
  }
  res.json(rows);
});

projectsRouter.patch('/:id', (req, res) => {
  const { pinned, userShelved } = req.body;
  const updated = updateProject(req.params.id, { pinned, userShelved });
  if (!updated) {
    res.status(404).json({ error: 'project_not_found' });
    return;
  }
  res.json(updated);
});