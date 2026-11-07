import { MiddlewareHandler } from 'hono';
import { CustomContext, Role, SessionData, UserProfile } from '../types/env';

const ROLE_HIERARCHY: Record<Role, number> = {
  founder: 10,
  staff: 8,
  dev: 8,
  client: 6,
  vip: 4,
  user: 2
};

export const authMiddleware = (): MiddlewareHandler<CustomContext> => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return c.json({ error: 'Acceso no autorizado: Token ausente' }, 401);
    }

    const sessionRaw = await c.env.SYNTHETIX_KVV.get(`session:${token}`);
    if (!sessionRaw) {
      return c.json({ error: 'Sesión inválida o revocada' }, 401);
    }

    const session: SessionData = JSON.parse(sessionRaw);

    const userRaw = await c.env.SYNTHETIX_KVV.get(`user:${session.userId}`);
    if (!userRaw) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    const user: UserProfile = JSON.parse(userRaw);
    if (user.isBanned) {
      await c.env.SYNTHETIX_KVV.delete(`session:${token}`);
      return c.json({ error: 'Cuenta suspendida permanentemente' }, 403);
    }

    c.set('user', session);
    await next();
  };
};

export const requireRole = (allowedRoles: Role[]): MiddlewareHandler<CustomContext> => {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) return c.json({ error: 'No autenticado' }, 401);

    const userRank = ROLE_HIERARCHY[user.role] || 0;
    const hasPermission = allowedRoles.some(role => userRank >= (ROLE_HIERARCHY[role] || 0));

    if (!hasPermission) {
      return c.json({ error: 'Acceso denegado: Privilegios insuficientes' }, 403);
    }

    await next();
  };
};
