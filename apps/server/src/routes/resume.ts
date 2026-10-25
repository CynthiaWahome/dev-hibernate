import { Router } from 'express';
import { getDb } from '../db.js';
import { generateResume, getResume, markVerified, listResumes } from '../resume/index.js';

export const resumeRouter = Router();

resumeRouter.post('/:projectId', (req, res) => {
  try {
    const record = generateResume(req.params.projectId);
    res.json(record);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

resumeRouter.get('/:projectId', (req, res) => {
  const record = getResume(req.params.projectId);
  if (!record) {
    res.status(404).json({ error: 'resume_not_found' });
    return;
  }
  res.json(record);
});

resumeRouter.patch('/:projectId/verify', (req, res) => {
  const { status } = req.body;
  if (!['verified', 'failed'].includes(status)) {
    res.status(400).json({ error: 'invalid_status' });
    return;
  }
  markVerified(req.params.projectId, status);
  const record = getResume(req.params.projectId);
  res.json(record);
});

resumeRouter.get('/', (_req, res) => {
  res.json(listResumes());
});