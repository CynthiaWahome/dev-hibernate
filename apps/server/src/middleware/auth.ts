import { Request, Response, NextFunction } from 'express';

const VALID_TOKENS = new Set<string>([process.env.APP_TOKEN || generateToken()]);

function generateToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip health and static routes
  if (req.path === '/health' && req.method === 'GET') {
    return next();
  }

  const token = req.headers['x-app-token'];
  if (!token || !VALID_TOKENS.has(token)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  // Validate Origin/Host on mutations
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const origin = req.headers['origin'];
    const host = req.headers['host'];
    const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:5173';
    const allowedHost = process.env.ALLOWED_HOST || '127.0.0.1:5173';

    if (origin && origin !== allowedOrigin) {
      res.status(403).json({ error: 'origin_not_allowed' });
      return;
    }
    if (host && host !== allowedHost) {
      res.status(403).json({ error: 'host_not_allowed' });
      return;
    }
  }

  next();
}