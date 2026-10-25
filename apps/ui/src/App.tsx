import { useEffect, useState } from 'react';
import logo from './assets/logo.svg';
import './index.css';

const API = '';
let TOKEN: string | null = null;

async function api(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['X-App-Token'] = TOKEN;
  const res = await fetch(`${API}/api${path}`, { ...opts, headers });
  if (res.status === 401) { TOKEN = null; window.location.reload(); return null; }
  return res.json();
}

interface Project {
  id: string;
  ecosystem: string;
  status: string;
  pinned: number;
  user_shelved: number;
  root_id: string;
  relative_location: string;
  root_path: string;
  candidate_bytes: number;
}

function formatBytes(n: number): string {
  if (!n) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function projectPath(p: Project): string {
  if (!p.root_path) return p.relative_location;
  return p.relative_location === '.' ? p.root_path : `${p.root_path}/${p.relative_location}`;
}

// 3 columns × 3 rows — beyond this the grid paginates inside its own container
const PAGE_SIZE = 9;

const ERROR_TEXT: Record<string, string> = {
  invalid_path: 'That folder wasn’t found. Use a full path like /Users/you/dev/my-app (a leading ~ is fine).',
  path_blocked: 'That’s a protected system folder. Pick a folder inside your home directory instead.',
  path_required: 'Enter a folder path.',
  origin_not_allowed: 'The app blocked this request’s origin. Reload the page and try again.',
};

function Footer() {
  return (
    <footer className="footer">
      <img src={logo} alt="" className="logo" width="18" height="18" />
      <span>DevHibernate</span>
      <span style={{ margin: '0 8px' }}>·</span>
      <span>2026</span>
      <span style={{ margin: '0 8px' }}>·</span>
      <span>All rights reserved</span>
      <span style={{ margin: '0 8px' }}>·</span>
      <a href="/docs" target="_blank" rel="noopener">API docs</a>
      <span style={{ margin: '0 8px' }}>·</span>
      <a href="https://wamzii.com" target="_blank" rel="noopener">wamzii.com</a>
    </footer>
  );
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [rootPath, setRootPath] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/bootstrap`).then(r => r.json()).then(t => {
      setToken(t.token);
      TOKEN = t.token;
      loadProjects();
    });
  }, []);

  async function loadProjects() {
    const data = await api('/projects');
    if (data) setProjects(data);
  }

  async function registerRoot(e: React.FormEvent) {
    e.preventDefault();
    const path = rootPath.trim();
    if (!path) return;
    setRegistering(true);
    setError(null);
    try {
      const root = await api('/roots', { method: 'POST', body: JSON.stringify({ path }) });
      if (!root) return;
      if (root.error) {
        setError(ERROR_TEXT[root.error] ?? 'Could not register that folder.');
        return;
      }
      await api('/scans', { method: 'POST', body: JSON.stringify({ rootId: root.id }) });
      setRootPath('');
      // discovery runs asynchronously; re-fetch after it has had a moment
      setTimeout(loadProjects, 800);
      setTimeout(loadProjects, 2200);
    } finally {
      setRegistering(false);
    }
  }

  async function toggleShelve(p: Project) {
    await api(`/projects/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ userShelved: !p.user_shelved }),
    });
    loadProjects();
  }

  async function togglePin(p: Project) {
    await api(`/projects/${p.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned: !p.pinned }),
    });
    loadProjects();
  }

  if (!token) {
    return (
      <div className="app">
        <div className="main"><div className="empty">Loading…</div></div>
        <Footer />
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(projects.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = projects.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img src={logo} alt="DevHibernate" width="32" height="32" />
          <div>
            <h1>DevHibernate</h1>
            <div className="sub">Hibernate projects. Return when ready.</div>
          </div>
        </div>
        <form className="root-form header-form" onSubmit={registerRoot}>
          <input
            aria-label="Folder path to register"
            className="input mono"
            placeholder="/Users/you/dev/my-app"
            value={rootPath}
            onChange={e => setRootPath(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn btn-primary" type="submit" disabled={registering || !rootPath.trim()}>
            {registering ? 'Scanning…' : 'Register & scan'}
          </button>
        </form>
      </header>

      <div className="privacy-bar">
        <span aria-hidden="true">🔒</span>
        <span>
          <strong>Your code stays private.</strong> Only this folder is scanned — filenames and sizes
          only, never your file contents or <code>.env</code>.
        </span>
      </div>
      {error && <div className="error-bar">{error}</div>}

      <main className="main">
        <div className="card">
          <h2>Projects</h2>
          {projects.length > 0 && (
            <p className="section-hint">
              <strong>Shelve</strong> marks a project ready for hibernation (its <code>node_modules</code> can be
              removed) · <strong>Pin</strong> protects it — never removed, even if shelved.
            </p>
          )}
          {projects.length === 0 ? (
            <div className="empty">
              <p style={{ marginBottom: 'var(--s6)' }}>
                No projects yet. Register a folder above and DevHibernate will discover the
                projects inside it.
              </p>
              <div className="chain">
                <span>Root</span>
                <span>Project</span>
                <span>Scan</span>
                <span>Candidate</span>
                <span>Plan</span>
                <span>Operation</span>
                <span>Resume&nbsp;Record</span>
              </div>
            </div>
          ) : (
            <div className="grid">
              {pageItems.map(p => (
                <div key={p.id} className="project-card">
                  <div className="info">
                    <h3 title={projectPath(p)}>
                      <span aria-hidden="true" style={{ marginRight: '8px' }}>📦</span>
                      {p.relative_location === '.' ? 'Project root' : p.relative_location}
                    </h3>
                    <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                      {p.pinned ? <span className="badge badge-active">pinned</span> : null}
                      {p.user_shelved ? <span className="badge badge-shelved">shelved</span> : null}
                      <span>{p.ecosystem.charAt(0).toUpperCase() + p.ecosystem.slice(1)}</span>
                      {p.candidate_bytes > 0 && (
                        <span className="tnum">· {formatBytes(p.candidate_bytes)} recoverable</span>
                      )}
                    </div>
                  </div>
                  <div className="card-actions">
                    <button
                      className={`btn ${p.user_shelved ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={() => toggleShelve(p)}
                      title="Mark this project ready for hibernation — its node_modules becomes eligible for removal"
                    >
                      {p.user_shelved ? 'Unshelve' : 'Shelve'}
                    </button>
                    <button
                      className={`btn ${p.pinned ? 'btn-danger' : 'btn-ghost'}`}
                      onClick={() => togglePin(p)}
                      title="Protect this project — it is never removed, even if shelved"
                    >
                      {p.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {projects.length > PAGE_SIZE && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                ← Prev
              </button>
              <span>Page {safePage + 1} of {totalPages}</span>
              <button
                className="btn btn-ghost"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
