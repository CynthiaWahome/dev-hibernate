import { Router } from 'express';
import { getDb } from '../db.js';
import { executeOperation, getOperation, getOperationsForPlan } from '../executor/index.js';
import { v4 as uuid } from 'uuid';

export const operationsRouter = Router();

operationsRouter.post('/', async (req, res) => {
  const { planId, selectedIds, idempotencyKey } = req.body;
  if (!planId || !selectedIds || !Array.isArray(selectedIds)) {
    res.status(400).json({ error: 'planId and selectedIds required' });
    return;
  }

  const key = idempotencyKey || uuid();

  try {
    const result = await executeOperation(planId, selectedIds, key);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

operationsRouter.get('/:id', (req, res) => {
  const op = getOperation(req.params.id);
  if (!op) {
    res.status(404).json({ error: 'operation_not_found' });
    return;
  }
  res.json(op);
});

operationsRouter.get('/plan/:planId', (req, res) => {
  const ops = getOperationsForPlan(req.params.planId);
  res.json(ops);
});