import { useEffect, useState } from 'react';
import './index.css';

const API = 'http://127.0.0.1:4317';
let TOKEN: string | null = null;

async function api(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['X-App-Token'] = TOKEN;
  const res = await fetch(`${API}/api${path}`, { ...opts, headers });
  if (res.status === 401) {
    TOKEN = null;
    window.location.reload();
    return null;
  }
  return res.json();
}

interface Project {
  id: string;
  ecosystem: string;
  status: string;
  pinned: number;
  user_shelved: number;
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

  if (!token) return <div className="app"><div className="main"><div className="empty">Loading...</div></div></div>;

  return (
    <div className="app">
      <div className="header">
        <img src="/assets/logo.svg" alt="DevHibernate" />
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
                    <h3>{p.ecosystem} project</h3>
                    <div className="meta">
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                      {p.pinned && <span className="badge badge-active">pinned</span>}
                      {p.user_shelved && <span className="badge badge-shelved">shelved</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
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
    </div>
  );
}