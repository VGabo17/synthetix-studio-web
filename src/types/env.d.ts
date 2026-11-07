import { KVNamespace, R2Bucket } from '@cloudflare/workers-types';

export type Role = 'founder' | 'staff' | 'dev' | 'client' | 'vip' | 'user';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: Role;
  discordId?: string;
  avatar?: string;
  isBanned: boolean;
  createdAt: string;
}

export interface SessionData {
  userId: string;
  username: string;
  role: Role;
  createdAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'staff_reply' | 'client_reply' | 'closed';
  createdAt: string;
  messages: Array<{
    senderId: string;
    senderName: string;
    role: Role;
    message: string;
    attachmentUrl?: string;
    timestamp: string;
  }>;
}

export interface Env {
  SYNTHETIX_KVV: KVNamespace;
  SYNTHETIX_R2: R2Bucket;
  JWT_SECRET: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  DISCORD_REDIRECT_URI: string;
  STAFF_WEBHOOK_URL: string;
}

export type CustomContext = {
  Bindings: Env;
  Variables: {
    user: SessionData;
  };
};
