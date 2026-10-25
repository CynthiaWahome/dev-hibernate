import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { randomBytes } from 'node:crypto';
import { getDb } from './db.ts';
import { healthRouter } from './routes/health.ts';
import { rootsRouter } from './routes/roots.ts';
import { scansRouter } from './routes/scans.ts';
import { candidatesRouter } from './routes/candidates.ts';
import { plansRouter } from './routes/plans.ts';
import { projectsRouter } from './routes/projects.ts';
import { docsRouter } from './routes/docs.ts';

const PORT = Number(process.env.PORT || 4317);
const TOKEN = randomBytes(32).toString('hex');

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  noSniff: true,
  frameguard: { action: 'deny' },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-App-Token'],
}));

app.use(express.json({ limit: '1mb' }));

app.use('/api', healthRouter);

// Token bootstrap endpoint - returns token to client
app.get('/api/bootstrap', (req, res) => {
  res.json({ token: TOKEN });
});

// Protected routes
app.use('/api', (req, res, next) => {
  // Skip health and bootstrap
  if (req.path === '/health' || req.path === '/bootstrap') {
    return next();
  }

  const token = req.headers['x-app-token'];
  if (!token || token !== TOKEN) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  // Validate Origin/Host on mutations
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers['origin'];
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173';

    if (origin && origin !== allowedOrigin) {
      res.status(403).json({ error: 'origin_not_allowed' });
      return;
    }
  }

  next();
});

app.use('/api/roots', rootsRouter);
app.use('/api/scans', scansRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/plans', plansRouter);

// Docs (public)
app.use(docsRouter);

// Initialize DB lazily
getDb();

app.get('/', (_req, res) => {
  res.redirect('/api/health');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`DevHibernate server running at http://127.0.0.1:${PORT}`);
  console.log(`Bootstrap token available at /api/bootstrap`);
});