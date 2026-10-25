import { Router } from 'express';
import { getDb } from '../db.js';
import { v4 as uuid } from 'uuid';

export const plansRouter = Router();

interface InventoryDTO {
  schemaVersion: number;
  projectId: string;
  ecosystem: string;
  markers: string[];
  activity: string;
  pinned: boolean;
  userShelved: boolean;
  scanComplete: boolean;
  candidates: Array<{
    id: string;
    kind: string;
    logicalBytes: number;
    policyEligible: boolean;
    blockers: string[];
  }>;
}

plansRouter.post('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const { scanId } = req.body;
  const db = getDb();

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
  if (!project) {
    res.status(404).json({ error: 'project_not_found' });
    return;
  }

  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(scanId) as any;
  if (!scan) {
    res.status(404).json({ error: 'scan_not_found' });
    return;
  }

  const candidates = db.prepare('SELECT * FROM candidates WHERE project_id = ?').all(projectId) as any[];

  const dto: InventoryDTO = {
    schemaVersion: 1,
    projectId: project.id,
    ecosystem: project.ecosystem,
    markers: [],
    activity: 'unknown',
    pinned: Boolean(project.pinned),
    userShelved: Boolean(project.userShelved),
    scanComplete: scan.completeness === 'complete',
    candidates: candidates.map(c => ({
      id: c.id,
      kind: c.kind,
      logicalBytes: c.logical_bytes,
      policyEligible: JSON.parse(c.blockers || '[]').length === 0,
      blockers: JSON.parse(c.blockers || '[]').map((b: any) => b.code),
    })),
  };

  const planId = uuid();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO plans (id, project_id, scan_id, candidate_ids, policy_version, expires_at, status)
     VALUES (?, ?, ?, ?, ?, ?, 'generating')`
  ).run(
    planId,
    projectId,
    scanId,
    JSON.stringify(dto.candidates.map(c => c.id)),
    1,
    expiresAt,
  );

  // Call Ollama
  try {
    const ollamaRes = await fetch('http://127.0.0.1:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:1b',
        prompt: buildPrompt(dto),
        format: buildSchema(),
        stream: false,
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!ollamaRes.ok) {
      db.prepare('UPDATE plans SET status = ? WHERE id = ?').run('failed', planId);
      res.status(503).json({ error: 'model_unavailable', planId });
      return;
    }

    const ollamaJson = JSON.parse(await ollamaRes.text());
    const modelResult = JSON.parse(ollamaJson.response);

    // Validate with policy overlay
    const validated = validateModelResult(modelResult, dto);
    db.prepare(
      `UPDATE plans SET model_result = ?, status = ? WHERE id = ?`
    ).run(JSON.stringify(validated), 'reviewable', planId);

    res.json({ planId, status: 'reviewable' });
  } catch (err) {
    db.prepare('UPDATE plans SET status = ? WHERE id = ?').run('failed', planId);
    res.status(503).json({ error: 'model_unavailable', planId });
  }
});

plansRouter.get('/:id', (req, res) => {
  const db = getDb();
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(req.params.id) as any;
  if (!plan) {
    res.status(404).json({ error: 'plan_not_found' });
    return;
  }
  res.json({ ...plan, model_result: plan.model_result ? JSON.parse(plan.model_result) : null });
});

function buildPrompt(dto: InventoryDTO): string {
  return `Assess this project for hibernation. Return JSON only.

Project: ${dto.projectId}
Ecosystem: ${dto.ecosystem}
Pinned: ${dto.pinned}
Shelved: ${dto.userShelved}
Scan complete: ${dto.scanComplete}

Candidates:
${dto.candidates.map(c => `- ${c.id} (${c.kind}, ${c.logicalBytes} bytes, eligible: ${c.policyEligible})`).join('\n')}

Recommendation: "hibernate" or "skip" or "blocked".
Select candidate IDs from the list above.
Provide evidence and a restart checklist.`;
}

function buildSchema(): object {
  return {
    type: 'object',
    properties: {
      recommendation: { type: 'string', enum: ['hibernate', 'skip', 'blocked'] },
      selectedIds: { type: 'array', items: { type: 'string' } },
      evidence: { type: 'string' },
      restartChecklist: { type: 'array', items: { type: 'string' } },
    },
    required: ['recommendation', 'selectedIds', 'evidence', 'restartChecklist'],
  };
}

function validateModelResult(result: any, dto: InventoryDTO): any {
  const validIds = new Set(dto.candidates.map(c => c.id));
  const selectedIds = (result.selectedIds || []).filter((id: string) => validIds.has(id));

  // Policy overlay: pinned/unshelved/incomplete cannot proceed
  if (dto.pinned || !dto.userShelved || !dto.scanComplete) {
    return { recommendation: 'blocked', selectedIds: [], evidence: 'Policy overlay: project pinned or not shelved or scan incomplete', restartChecklist: [] };
  }

  // No eligible candidates
  if (dto.candidates.every(c => !c.policyEligible)) {
    return { recommendation: 'blocked', selectedIds: [], evidence: 'No eligible candidates', restartChecklist: [] };
  }

  return {
    recommendation: result.recommendation || 'skip',
    selectedIds,
    evidence: result.evidence || '',
    restartChecklist: result.restartChecklist || [],
  };
}