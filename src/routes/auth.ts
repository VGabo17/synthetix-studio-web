import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CustomContext, UserProfile, SessionData } from '../types/env';
import { hashPassword, verifyPassword, generateToken } from '../lib/crypto';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono<CustomContext>();

const registerSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { username, email, password } = c.req.valid('json');

  const existingEmail = await c.env.SYNTHETIX_KVV.get(`index:email:${email}`);
  if (existingEmail) return c.json({ error: 'El correo ya está registrado' }, 400);

  const existingUser = await c.env.SYNTHETIX_KVV.get(`index:username:${username}`);
  if (existingUser) return c.json({ error: 'El nombre de usuario ya está ocupado' }, 400);

  const userId = crypto.randomUUID();
  const { hash, salt } = await hashPassword(password);

  const isFirstUser = (await c.env.SYNTHETIX_KVV.get('system:setup')) === null;
  const role = isFirstUser ? 'founder' : 'user';

  if (isFirstUser) {
    await c.env.SYNTHETIX_KVV.put('system:setup', 'configured');
  }

  const newUser: UserProfile = {
    id: userId,
    username,
    email,
    passwordHash: hash,
    salt,
    role,
    isBanned: false,
    createdAt: new Date().toISOString()
  };

  await c.env.SYNTHETIX_KVV.put(`user:${userId}`, JSON.stringify(newUser));
  await c.env.SYNTHETIX_KVV.put(`index:email:${email}`, userId);
  await c.env.SYNTHETIX_KVV.put(`index:username:${username}`, userId);

  const token = generateToken();
  const session: SessionData = { userId, username, role, createdAt: new Date().toISOString() };
  await c.env.SYNTHETIX_KVV.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 86400 });

  return c.json({ success: true, token, user: { id: userId, username, email, role } });
});

auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');

  let userId = await c.env.SYNTHETIX_KVV.get(`index:username:${username}`);
  if (!userId) {
    userId = await c.env.SYNTHETIX_KVV.get(`index:email:${username}`);
  }

  if (!userId) return c.json({ error: 'Credenciales inválidas' }, 401);

  const userRaw = await c.env.SYNTHETIX_KVV.get(`user:${userId}`);
  if (!userRaw) return c.json({ error: 'Usuario no encontrado' }, 404);

  const user: UserProfile = JSON.parse(userRaw);

  if (user.isBanned) return c.json({ error: 'Cuenta suspendida' }, 403);

  const isValid = await verifyPassword(password, user.passwordHash, user.salt);
  if (!isValid) return c.json({ error: 'Credenciales inválidas' }, 401);

  const token = generateToken();
  const session: SessionData = { userId: user.id, username: user.username, role: user.role, createdAt: new Date().toISOString() };
  await c.env.SYNTHETIX_KVV.put(`session:${token}`, JSON.stringify(session), { expirationTtl: 86400 });

  return c.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
});

auth.get('/me', authMiddleware(), async (c) => {
  const session = c.get('user');
  const userRaw = await c.env.SYNTHETIX_KVV.get(`user:${session.userId}`);
  if (!userRaw) return c.json({ error: 'No encontrado' }, 404);
  const user: UserProfile = JSON.parse(userRaw);
  return c.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role, discordId: user.discordId } });
});

export default auth;
