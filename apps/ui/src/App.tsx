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
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [token, setToken] = useState<string | null>(null);

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

  if (!token) return (
    <div className="app">
      <div className="main"><div className="empty">Loading...</div></div>
      <footer className="footer">
        <img src={logo} alt="" className="logo" width="20" height="20" />
        <span>DevHibernate</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>2026</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>All rights reserved</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <a href="https://wamzii.com" target="_blank" rel="noopener">wamzii.com</a>
      </footer>
    </div>
  );

  return (
    <div className="app">
      <div className="header">
        <img src={logo} alt="DevHibernate" width="32" height="32" />
        <div>
          <h1>DevHibernate</h1>
          <div className="sub">Hibernate projects. Return when ready.</div>
        </div>
      </div>

      <div className="main">
        <div className="card">
          <h2>Projects</h2>
          {projects.length === 0 ? (
            <div className="empty">No projects discovered yet. Register a root to begin.</div>
          ) : (
            <div className="grid">
              {projects.map(p => (
                <div key={p.id} className="project-card">
                  <div className="info">
                    <h3>
                      <span aria-hidden="true" style={{ marginRight: '8px' }}>📦</span>
                      {p.relative_location === '.' ? 'Project root' : p.relative_location}
                    </h3>
                    <div className="meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                      {p.pinned ? <span className="badge badge-active">pinned</span> : null}
                      {p.user_shelved ? <span className="badge badge-shelved">shelved</span> : null}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {p.ecosystem.charAt(0).toUpperCase() + p.ecosystem.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                    <button
                      className={`btn ${p.user_shelved ? 'btn-ghost' : 'btn-primary'}`}
                      onClick={() => toggleShelve(p)}
                    >
                      {p.user_shelved ? 'Unshelve' : 'Shelve'}
                    </button>
                    <button
                      className={`btn ${p.pinned ? 'btn-danger' : 'btn-ghost'}`}
                      onClick={() => togglePin(p)}
                    >
                      {p.pinned ? 'Unpin' : 'Pin'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2>Guide</h2>
          <div style={{ fontSize: '14px', lineHeight: '1.8', color: 'var(--text)' }}>
            <p style={{ marginBottom: '12px' }}>
              <strong>Shelve</strong> — Mark a project as ready for hibernation.
              Shelved projects have their <code>node_modules</code> eligible for removal.
            </p>
            <p style={{ marginBottom: '12px' }}>
              <strong>Pin</strong> — Protect a project from hibernation.
              Pinned projects are never touched, even if shelved.
            </p>
            <p style={{ color: 'var(--text-muted)' }}>
              A project must be <strong>shelved</strong> and <strong>not pinned</strong> before it
              can be hibernated. Use the Review screen to confirm before deletion.
            </p>
          </div>
        </div>

        <div className="card">
          <h2>How It Works</h2>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
            <span>Root →</span>
            <span>Project →</span>
            <span>Scan →</span>
            <span>Candidate →</span>
            <span>Plan →</span>
            <span>Operation →</span>
            <span>Resume Record</span>
          </div>
        </div>
      </div>

      <footer className="footer">
        <img src={logo} alt="" className="logo" width="20" height="20" />
        <span>DevHibernate</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>2026</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <span>All rights reserved</span>
        <span style={{ margin: '0 8px' }}>·</span>
        <a href="https://wamzii.com" target="_blank" rel="noopener">wamzii.com</a>
      </footer>
    </div>
  );
}