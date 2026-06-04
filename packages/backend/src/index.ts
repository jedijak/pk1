import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';

import { authMiddleware } from './middleware/auth.js';
import health from './routes/health.js';
import projects from './routes/projects.js';
import cards from './routes/cards.js';
import views from './routes/views.js';
import boardState from './routes/boardState.js';
import recommendations from './routes/recommendations.js';
import agent from './routes/agent.js';

const app = new Hono();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization', 'X-Service-Role'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  }),
);

// ─── Public Routes ────────────────────────────────────────────────────────────
app.route('/api/v1/health', health);

// ─── Auth Middleware (all routes below require a valid JWT) ───────────────────
app.use('/api/v1/*', authMiddleware);

// ─── Protected Routes ─────────────────────────────────────────────────────────
app.route('/api/v1', projects);   // /api/v1/projects*
app.route('/api/v1', cards);       // /api/v1/projects/:id/cards* and /api/v1/cards/*
app.route('/api/v1/views', views);
app.route('/api/v1/board-state', boardState);
app.route('/api/v1/recommendations', recommendations);
app.route('/api/v1/agent', agent);

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ─── Error handler ────────────────────────────────────────────────────────────
app.onError((err, c) => {
  console.error('[unhandled error]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`PK1 backend running on http://localhost:${info.port}`);
  },
);

export default app;
