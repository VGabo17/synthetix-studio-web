import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { CustomContext } from './types/env';
import auth from './routes/auth';
import tickets from './routes/tickets';
import admin from './routes/admin';
import resources from './routes/resources';

const app = new Hono<CustomContext>();

app.use('*', cors());

// Montar submódulos de la API
app.route('/api/auth', auth);
app.route('/api/tickets', tickets);
app.route('/api/admin', admin);
app.route('/api/resources', resources);

// Fallback a archivos estáticos del frontend
app.get('*', async (c) => {
  return c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.text('Synthetix Studio Web API Active');
});

export default app;
