import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { initWebSocket } from './utils/websocket';
import { config } from './config';
import authRoutes from './routes/auth';
import assignmentRoutes from './routes/assignments';
import groupRoutes from './routes/groups';
import resourceRoutes from './routes/resources';
import notificationRoutes from './routes/notifications';
import toolkitRoutes from './routes/toolkit';
import { maybeStartBullMQWorker } from './workers/generationWorker';
import { getBullMQRedis, isBullMQAvailable } from './queues/generationQueue';
import { initEmailCronJob } from './workers/emailCronWorker';

const app = express();
const httpServer = http.createServer(app);

// ─── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:3000',
  'https://assignment-vedaai.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (health checks, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  xFrameOptions: false 
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── WebSocket ───────────────────────────────────────────────────────────────
initWebSocket(httpServer);

// ─── Static Files ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'VedaAI Backend' }));
app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/toolkit', toolkitRoutes);

// ─── 404 & Error Handler ─────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function boot() {
  await mongoose.connect(config.mongoUri);
  console.log('✅ MongoDB connected');

  const redis = getBullMQRedis();
  if (redis) {
    redis.on('ready', () => {
      console.log('✅ Redis connected successfully');
      maybeStartBullMQWorker(redis);
      initEmailCronJob();
    });
  } else {
    console.error('❌ Redis URL is invalid. BullMQ requires Redis.');
  }

  httpServer.listen(config.port, () => {
    console.log(`🚀 Server running at http://localhost:${config.port}`);
  });
}

boot().catch((err) => {
  console.error('Fatal boot error:', err);
  process.exit(1);
});
