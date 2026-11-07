import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { CustomContext, Ticket } from '../types/env';
import { authMiddleware, requireRole } from '../middleware/auth';

const tickets = new Hono<CustomContext>();
tickets.use('*', authMiddleware());

const createTicketSchema = z.object({
  subject: z.string().min(5).max(100),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  message: z.string().min(10)
});

tickets.post('/', zValidator('json', createTicketSchema), async (c) => {
  const user = c.get('user');
  const { subject, priority, message } = c.req.valid('json');

  const ticketId = crypto.randomUUID();
  const newTicket: Ticket = {
    id: ticketId,
    userId: user.userId,
    username: user.username,
    subject,
    priority,
    status: 'open',
    createdAt: new Date().toISOString(),
    messages: [{
      senderId: user.userId,
      senderName: user.username,
      role: user.role,
      message,
      timestamp: new Date().toISOString()
    }]
  };

  await c.env.SYNTHETIX_KVV.put(`ticket:${ticketId}`, JSON.stringify(newTicket));
  
  const userTicketsRaw = await c.env.SYNTHETIX_KVV.get(`user:tickets:${user.userId}`);
  const userTickets: string[] = userTicketsRaw ? JSON.parse(userTicketsRaw) : [];
  userTickets.push(ticketId);
  await c.env.SYNTHETIX_KVV.put(`user:tickets:${user.userId}`, JSON.stringify(userTickets));

  return c.json({ success: true, ticket: newTicket });
});

tickets.get('/', async (c) => {
  const user = c.get('user');
  if (['founder', 'staff'].includes(user.role)) {
    const list = await c.env.SYNTHETIX_KVV.list({ prefix: 'ticket:' });
    const allTickets = await Promise.all(
      list.keys.map(async (k) => JSON.parse((await c.env.SYNTHETIX_KVV.get(k.name)) || '{}'))
    );
    return c.json(allTickets);
  } else {
    const userTicketsRaw = await c.env.SYNTHETIX_KVV.get(`user:tickets:${user.userId}`);
    const ticketIds: string[] = userTicketsRaw ? JSON.parse(userTicketsRaw) : [];
    const myTickets = await Promise.all(
      ticketIds.map(async (id) => JSON.parse((await c.env.SYNTHETIX_KVV.get(`ticket:${id}`)) || '{}'))
    );
    return c.json(myTickets);
  }
});

tickets.post('/:id/upload', async (c) => {
  const ticketId = c.req.param('id');
  const body = await c.req.parseBody();
  const file = body['file'] as File;

  if (!file) return c.json({ error: 'Archivo no provisto' }, 400);
  if (file.size > 5 * 1024 * 1024) return c.json({ error: 'El archivo excede el límite de 5 MB' }, 400);

  const fileId = crypto.randomUUID();
  const r2Key = `tickets/${ticketId}/attachments/${fileId}-${file.name}`;
  await c.env.SYNTHETIX_R2.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });

  return c.json({ success: true, url: `/api/resources/attachment/${btoa(r2Key)}` });
});

export default tickets;
