import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';

let _redisForBullMQ: IORedis | null = null;
let _available = false;

export function getBullMQRedis(): IORedis | null {
  if (_redisForBullMQ) return _redisForBullMQ;
  try {
    _redisForBullMQ = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
      tls: config.redisUrl.startsWith('rediss://') ? {} : undefined,
    });
    _redisForBullMQ.on('connect', () => { _available = true; });
    _redisForBullMQ.on('error', () => { _available = false; });
    return _redisForBullMQ;
  } catch {
    return null;
  }
}

export function isBullMQAvailable() { return _available; }

let _queue: Queue | null = null;
export function getGenerationQueue(): Queue {
  if (_queue) return _queue;
  const redis = getBullMQRedis();
  if (!redis) throw new Error('Redis not initialized for BullMQ');
  
  _queue = new Queue('question-generation', {
    connection: redis as any,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 50 },
    },
  });
  return _queue;
}

export interface GenerationJobData {
  userId: string;
  assignmentId: string;
  title: string;
  subject: string;
  className: string;
  chapters: string[];
  questionTypes: Array<{ type: string; count: number; marks: number }>;
  additionalInstructions: string;
  fileContent?: string;
}
