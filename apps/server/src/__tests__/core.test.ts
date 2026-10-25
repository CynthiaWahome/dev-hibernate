import { beforeAll, describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { v4 as uuid } from 'uuid';

// Isolated DB per test run — set before any app module is imported.
// realpathSync so macOS /var -> /private/var doesn't trip the executor's
// (correct) realpath === path safety check.
const base = realpathSync(mkdtempSync(join(tmpdir(), 'dh-test-')));
process.env.DB_PATH = join(base, 'test.sqlite');

const proj = join(base, 'proj');
let db: any, discoverProjects: any, inventoryCandidate: any, executeOperation: any;

beforeAll(async () => {
  mkdirSync(join(proj, 'node_modules', 'react'), { recursive: true });
  mkdirSync(join(proj, 'src'), { recursive: true });
  writeFileSync(join(proj, 'package.json'), '{"name":"proj"}');
  writeFileSync(join(proj, 'package-lock.json'), '{}');
  writeFileSync(join(proj, '.env'), 'SECRET=keep-me');
  writeFileSync(join(proj, 'src', 'index.js'), 'console.log("hi")');
  writeFileSync(join(proj, 'node_modules', 'react', 'index.js'), 'x'.repeat(50000));
  ({ getDb: db } = await import('../db.js'));
  db = db();
  ({ discoverProjects } = await import('../scanner/discover.js'));
  ({ inventoryCandidate } = await import('../scanner/inventory.js'));
  ({ executeOperation } = await import('../executor/index.js'));
});

describe('discovery', () => {
  it('finds the npm project and does not descend into node_modules', async () => {
    const rootId = uuid();
    db.prepare('INSERT INTO roots (id, canonical_path) VALUES (?,?)').run(rootId, proj);
    await discoverProjects(proj, uuid(), rootId);
    const projects = db.prepare('SELECT * FROM projects WHERE root_id = ?').all(rootId);
    expect(projects).toHaveLength(1);
    expect(projects[0].ecosystem).toBe('node');
  });
});

describe('inventory', () => {
  it('measures node_modules and de-duplicates on re-inventory', async () => {
    const projectId = db.prepare('SELECT id FROM projects LIMIT 1').get().id;
    const nm = join(proj, 'node_modules');
    await inventoryCandidate(projectId, nm);
    await inventoryCandidate(projectId, nm); // second pass must REPLACE, not stack
    const cands = db.prepare('SELECT * FROM candidates WHERE project_id = ?').all(projectId);
    expect(cands).toHaveLength(1);
    expect(cands[0].logical_bytes).toBeGreaterThan(40000);
  });
});

describe('executor preservation', () => {
  it('deletes node_modules but keeps .env, source and package.json', async () => {
    const p = db.prepare('SELECT id, root_id FROM projects LIMIT 1').get();
    const cand = db.prepare('SELECT * FROM candidates WHERE project_id = ?').get(p.id);
    const scanId = uuid();
    db.prepare('INSERT INTO scans (id, root_id, limits, start_at) VALUES (?,?,?,?)')
      .run(scanId, p.root_id, '{}', new Date().toISOString());
    const planId = uuid();
    db.prepare(
      `INSERT INTO plans (id, project_id, scan_id, candidate_ids, policy_version, expires_at, status)
       VALUES (?, ?, ?, ?, 1, ?, 'reviewable')`
    ).run(planId, p.id, scanId, JSON.stringify([cand.id]), new Date(Date.now() + 5 * 60_000).toISOString());

    const envBefore = readFileSync(join(proj, '.env'), 'utf8');
    const result = await executeOperation(planId, [cand.id], uuid());

    expect(result.perTarget[cand.id].status).toBe('deleted');
    expect(existsSync(join(proj, 'node_modules'))).toBe(false); // removed
    expect(existsSync(join(proj, 'src', 'index.js'))).toBe(true); // preserved
    expect(existsSync(join(proj, 'package.json'))).toBe(true); // preserved
    expect(readFileSync(join(proj, '.env'), 'utf8')).toBe(envBefore); // .env untouched
  });
});
