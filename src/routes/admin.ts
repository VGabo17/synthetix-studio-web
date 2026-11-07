import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CustomContext, Role, UserProfile } from '../types/env';
import { authMiddleware, requireRole } from '../middleware/auth';

const admin = new Hono<CustomContext>();
admin.use('*', authMiddleware());

// Listar todos los usuarios
admin.get('/users', requireRole(['staff', 'founder']), async (c) => {
  const usersList = await c.env.SYNTHETIX_KVV.list({ prefix: 'user:' });
  const users = await Promise.all(
    usersList.keys.map(async (k) => {
      const u = JSON.parse((await c.env.SYNTHETIX_KVV.get(k.name)) || '{}');
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isBanned: !!u.isBanned,
        createdAt: u.createdAt
      };
    })
  );
  return c.json(users);
});

// Banear usuario y purgar sus sesiones activas en KV
admin.post('/ban/:userId', requireRole(['staff', 'founder']), async (c) => {
  const targetId = c.req.param('userId');
  const userRaw = await c.env.SYNTHETIX_KVV.get(`user:${targetId}`);
  if (!userRaw) return c.json({ error: 'Usuario no encontrado' }, 404);

  const user: UserProfile = JSON.parse(userRaw);
  user.isBanned = true;
  await c.env.SYNTHETIX_KVV.put(`user:${targetId}`, JSON.stringify(user));

  const sessionList = await c.env.SYNTHETIX_KVV.list({ prefix: 'session:' });
  for (const key of sessionList.keys) {
    const sessRaw = await c.env.SYNTHETIX_KVV.get(key.name);
    if (sessRaw) {
      const sess = JSON.parse(sessRaw);
      if (sess.userId === targetId) {
        await c.env.SYNTHETIX_KVV.delete(key.name);
      }
    }
  }

  return c.json({ success: true, message: `Usuario ${user.username} baneado exitosamente` });
});

// Cambiar rol de usuario (Exclusivo Founder)
admin.post('/role/:userId', requireRole(['founder']), zValidator('json', z.object({ role: z.enum(['founder', 'staff', 'dev', 'client', 'vip', 'user']) })), async (c) => {
  const targetId = c.req.param('userId');
  const { role } = c.req.valid('json');

  const userRaw = await c.env.SYNTHETIX_KVV.get(`user:${targetId}`);
  if (!userRaw) return c.json({ error: 'Usuario no encontrado' }, 404);

  const user: UserProfile = JSON.parse(userRaw);
  user.role = role as Role;
  await c.env.SYNTHETIX_KVV.put(`user:${targetId}`, JSON.stringify(user));

  return c.json({ success: true, message: `Rol actualizado a ${role}` });
});

// Métricas globales
admin.get('/metrics', requireRole(['staff', 'founder']), async (c) => {
  const usersList = await c.env.SYNTHETIX_KVV.list({ prefix: 'user:' });
  const ticketsList = await c.env.SYNTHETIX_KVV.list({ prefix: 'ticket:' });
  return c.json({
    totalUsers: usersList.keys.length,
    totalTickets: ticketsList.keys.length,
    status: 'Optimal Edge Architecture'
  });
});

export default admin;
