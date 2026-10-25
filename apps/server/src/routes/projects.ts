import { Router } from 'express';
import { getDb } from '../db.js';
import { getProjects, getProject, updateProject } from '../scanner/discover.js';

export const projectsRouter = Router();

// Return each project with its root's absolute path and the total logical
// bytes of its removal candidates (0 until an inventory has run).
const PROJECT_SELECT = `
  SELECT p.*,
         r.canonical_path AS root_path,
         COALESCE((SELECT SUM(logical_bytes) FROM candidates c WHERE c.project_id = p.id), 0) AS candidate_bytes
  FROM projects p
  JOIN roots r ON r.id = p.root_id`;

projectsRouter.get('/', (req, res) => {
  const rootId = req.query.rootId as string;
  const db = getDb();
  const rows = rootId
    ? db.prepare(`${PROJECT_SELECT} WHERE p.root_id = ?`).all(rootId)
    : db.prepare(PROJECT_SELECT).all();
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