import { Hono } from 'hono';

const health = new Hono();

health.get('/', (c) => {
  return c.json({ status: 'ok', ts: Date.now() });
});

export default health;
