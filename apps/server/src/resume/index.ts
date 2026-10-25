import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

interface ResumeRecord {
  projectId: string;
  detectedMarkers: string[];
  suggestedSteps: string[];
  removedArtifacts: string[];
  verificationStatus: 'unverified' | 'verified' | 'failed';
}

const MARKER_PATTERNS: Record<string, string> = {
  'package.json': 'npm install',
  'package-lock.json': 'npm ci',
  'yarn.lock': 'yarn install --frozen-lockfile',
  'pnpm-lock.yaml': 'pnpm install --frozen-lockfile',
  'Cargo.toml': 'cargo build',
  'go.mod': 'go build',
  'requirements.txt': 'pip install -r requirements.txt',
  'Pipfile': 'pipenv install',
};

export async function generateResume(projectId: string): Promise<ResumeRecord> {
  const db = getDb();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
  if (!project) throw new Error('project_not_found');

  const root = db.prepare('SELECT * FROM roots WHERE id = ?').get(project.root_id) as any;
  if (!root) throw new Error('root_not_found');

  const fullPath = resolve(root.canonical_path, project.relative_location);

  // Detect markers (metadata only)
  const detectedMarkers: string[] = [];
  if (existsSync(fullPath)) {
    const entries = readdirSync(fullPath);
    for (const entry of entries) {
      if (MARKER_PATTERNS[entry]) {
        detectedMarkers.push(entry);
      }
    }
  }

  // Suggested steps based on markers
  const suggestedSteps: string[] = [];
  for (const marker of detectedMarkers) {
    suggestedSteps.push(MARKER_PATTERNS[marker]);
  }

  // Removed artifacts from operations
  const ops = db.prepare(
    'SELECT * FROM operations WHERE plan_id IN (SELECT id FROM plans WHERE project_id = ?)'
  ).all(projectId) as any[];

  const removedArtifacts: string[] = [];
  for (const op of ops) {
    const perTarget = JSON.parse(op.per_target_results || '{}');
    for (const [candidateId, result] of Object.entries(perTarget) as [string, any][]) {
      if (result.status === 'deleted') {
        removedArtifacts.push(candidateId);
      }
    }
  }

  const record: ResumeRecord = {
    projectId,
    detectedMarkers,
    suggestedSteps,
    removedArtifacts,
    verificationStatus: 'unverified',
  };

  db.prepare(
    `INSERT OR REPLACE INTO resume_records (project_id, detected_markers, suggested_steps, removed_artifacts, verification_status)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    projectId,
    JSON.stringify(detectedMarkers),
    JSON.stringify(suggestedSteps),
    JSON.stringify(removedArtifacts),
    'unverified'
  );

  return record;
}

export function getResume(projectId: string): ResumeRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM resume_records WHERE project_id = ?').get(projectId) as any;
  if (!row) return null;
  return {
    projectId: row.project_id,
    detectedMarkers: JSON.parse(row.detected_markers || '[]'),
    suggestedSteps: JSON.parse(row.suggested_steps || '[]'),
    removedArtifacts: JSON.parse(row.removed_artifacts || '[]'),
    verificationStatus: row.verification_status,
  };
}

export function markVerified(projectId: string, status: 'verified' | 'failed'): void {
  const db = getDb();
  db.prepare(
    `UPDATE resume_records SET verification_status = ? WHERE project_id = ?`
  ).run(status, projectId);
}

export function listResumes(): ResumeRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM resume_records').all() as any[];
  return rows.map(r => ({
    projectId: r.project_id,
    detectedMarkers: JSON.parse(r.detected_markers || '[]'),
    suggestedSteps: JSON.parse(r.suggested_steps || '[]'),
    removedArtifacts: JSON.parse(r.removed_artifacts || '[]'),
    verificationStatus: r.verification_status,
  }));
}