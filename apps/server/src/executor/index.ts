import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { rmSync, existsSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

interface OperationResult {
  id: string;
  planId: string;
  selectedIds: string[];
  perTarget: Record<string, { status: string; error?: string }>;
  startedAt: string;
  completedAt?: string;
}

export async function executeOperation(
  planId: string,
  selectedIds: string[],
  idempotencyKey: string
): Promise<OperationResult> {
  const db = getDb();
  const opId = uuid();

  // Check idempotency
  const existing = db.prepare(
    'SELECT id FROM operations WHERE idempotency_key = ?'
  ).get(idempotencyKey) as any;

  if (existing) {
    const prior = db.prepare('SELECT * FROM operations WHERE id = ?').get(existing.id) as any;
    return {
      id: prior.id,
      planId: prior.plan_id,
      selectedIds: JSON.parse(prior.selected_ids),
      perTarget: JSON.parse(prior.per_target_results),
      startedAt: prior.start_at,
      completedAt: prior.end_at || undefined,
    };
  }

  // Verify plan exists and is not stale
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as any;
  if (!plan) {
    throw new Error('plan_not_found');
  }

  if (new Date(plan.expires_at) < new Date()) {
    throw new Error('plan_expired');
  }

  if (plan.status !== 'reviewable') {
    throw new Error('plan_not_reviewable');
  }

  // Verify selected IDs are in the plan
  const planCandidateIds: string[] = JSON.parse(plan.candidate_ids || '[]');
  for (const id of selectedIds) {
    if (!planCandidateIds.includes(id)) {
      throw new Error(`candidate_not_in_plan: ${id}`);
    }
  }

  // Record operation start
  db.prepare(
    `INSERT INTO operations (id, plan_id, selected_ids, idempotency_key, start_at)
     VALUES (?, ?, ?, ?, datetime('now'))`
  ).run(opId, planId, JSON.stringify(selectedIds), idempotencyKey);

  const perTarget: Record<string, { status: string; error?: string }> = {};

  // Execute each target
  for (const candidateId of selectedIds) {
    try {
      await deleteCandidate(candidateId);
      perTarget[candidateId] = { status: 'deleted' };
    } catch (err: any) {
      perTarget[candidateId] = { status: 'failed', error: err.message };
    }
  }

  // Record completion
  const allDeleted = Object.values(perTarget).every(t => t.status === 'deleted');
  db.prepare(
    `UPDATE operations SET per_target_results = ?, end_at = datetime('now'), failure_reason = ?
     WHERE id = ?`
  ).run(
    JSON.stringify(perTarget),
    allDeleted ? null : 'some_targets_failed',
    opId
  );

  return {
    id: opId,
    planId,
    selectedIds,
    perTarget,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

async function deleteCandidate(candidateId: string): Promise<void> {
  const db = getDb();
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId) as any;
  if (!candidate) {
    throw new Error('candidate_not_found');
  }

  // Check blockers
  const blockers: any[] = JSON.parse(candidate.blockers || '[]');
  if (blockers.length > 0) {
    throw new Error(`blocked: ${blockers.map(b => b.code).join(', ')}`);
  }

  // Resolve path from project root
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(candidate.project_id) as any;
  if (!project) throw new Error('project_not_found');

  const root = db.prepare('SELECT * FROM roots WHERE id = ?').get(project.root_id) as any;
  if (!root) throw new Error('root_not_found');

  const fullPath = resolve(root.canonical_path, project.relative_location, candidate.relative_target);

  // Path-race strategy: re-check before delete
  if (!existsSync(fullPath)) {
    throw new Error('already_removed');
  }

  const st = lstatSync(fullPath);
  if (st.isSymbolicLink()) {
    throw new Error('symlink_detected');
  }

  const real = realpathSync(fullPath);
  if (real !== fullPath) {
    throw new Error('path_tampered');
  }

  // Only delete if it's a directory
  if (!st.isDirectory()) {
    throw new Error('not_a_directory');
  }

  // Delete
  rmSync(fullPath, { recursive: true, force: false });

  // Verify deletion
  if (existsSync(fullPath)) {
    throw new Error('deletion_failed');
  }
}

export function getOperation(id: string) {
  const db = getDb();
  const op = db.prepare('SELECT * FROM operations WHERE id = ?').get(id) as any;
  if (!op) return null;
  return {
    ...op,
    selectedIds: JSON.parse(op.selected_ids || '[]'),
    perTarget: JSON.parse(op.per_target_results || '{}'),
  };
}

export function getOperationsForPlan(planId: string) {
  const db = getDb();
  return db.prepare('SELECT * FROM operations WHERE plan_id = ?').all(planId);
}