import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'synthetix_ultra_secure_secret_key_2026';

export function authenticateToken(req, res, next) {
  const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso no autorizado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Sesión expirada o inválida' });
    req.user = user;
    next();
  });
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado: Privilegios de Administrador requeridos' });
  }
  next();
}
