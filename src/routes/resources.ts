import { Hono } from 'hono';
import { CustomContext } from '../types/env';
import { authMiddleware, requireRole } from '../middleware/auth';

const resources = new Hono<CustomContext>();

resources.get('/vault', authMiddleware(), async (c) => {
  return c.json([
    { id: 'synthetix-lifesteal', name: 'SoulForge LifeSteal Plugin', version: '2.1.0', format: '.jar', category: 'Minecraft Paper' },
    { id: 'synthetix-proxy', name: 'Velocity Network Engine', version: '1.4.0', format: '.jar', category: 'Minecraft Proxy' },
    { id: 'synthetix-bot', name: 'Synthetix Discord Core Bot', version: '3.0.0', format: '.zip', category: 'Discord Bot' }
  ]);
});

resources.post('/vault/upload', authMiddleware(), requireRole(['dev', 'founder']), async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'] as File;
  const name = body['name'] as string;

  if (!file || !name) return c.json({ error: 'Faltan parámetros obligatorios' }, 400);

  const key = `vault/${name}-${file.name}`;
  await c.env.SYNTHETIX_R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  return c.json({ success: true, key });
});

export default resources;
