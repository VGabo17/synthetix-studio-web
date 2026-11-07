import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticateToken, requireAdmin, JWT_SECRET } from './src/middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos en memoria (Simulación estructurada para producción)
const users = [];
const services = [
  { id: 'mc-config', title: 'Minecraft Server Configs', category: 'Minecraft', desc: 'Optimización Paper/Purpur, Spigot, Velocity Proxy y Setup completo de modalidades.', icon: '⛏️' },
  { id: 'mc-plugin', title: 'Desarrollo de Plugins Custom', category: 'Minecraft', desc: 'Plugins Java en Spigot/Paper API 1.20-1.21+, GUIs, Economía y NMS.', icon: '🧩' },
  { id: 'dc-bot', title: 'Bots de Discord Personalizados', category: 'Discord', desc: 'Bots Node.js/Discord.js v14 con Dashboard de control, tickets y verificación.', icon: '🤖' },
  { id: 'dc-community', title: 'Diseño de Servidores Discord', category: 'Discord', desc: 'Estructuración de roles, permisos, canales estéticos y bots de seguridad.', icon: '🛡️' }
];

// Sembrar cuenta Admin inicial
(async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  users.push({
    id: 1,
    username: 'admin',
    email: 'admin@synthetix.studio',
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date().toISOString()
  });
})();

// --- ENDPOINTS API ---

// Registro de Usuario
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Campos incompletos' });
  
  if (users.find(u => u.email === email || u.username === username)) {
    return res.status(400).json({ error: 'El usuario o email ya se encuentra registrado' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = { id: users.length + 1, username, email, password: hashedPassword, role: 'user', createdAt: new Date().toISOString() };
  users.push(newUser);

  const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true, secure: false });
  res.json({ success: true, user: { username: newUser.username, email: newUser.email, role: newUser.role } });
});

// Login de Usuario
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username || u.email === username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.cookie('token', token, { httpOnly: true, secure: false });
  res.json({ success: true, token, user: { username: user.username, email: user.email, role: user.role } });
});

// Obtener Usuario Actual
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

// Servicios
app.get('/api/services', (req, res) => {
  res.json(services);
});

// API Administrador Protegida
app.get('/api/admin/metrics', authenticateToken, requireAdmin, (req, res) => {
  res.json({
    totalUsers: users.length,
    activeServices: services.length,
    systemStatus: 'Optimal',
    users: users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt }))
  });
});

// --- RUTA UNIFICADA (Clean URLs: /dashboard, /admin, /login, /register, etc.) ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[SYNTHETIX STUDIO] Servidor activo en http://localhost:${PORT}`);
});
