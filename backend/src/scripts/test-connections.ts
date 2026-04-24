import mongoose from 'mongoose';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/veda-assessment';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

async function testConnections() {
  console.log('--- Database Connection Test ---');
  
  // Test MongoDB
  console.log(`\nTesting MongoDB connection to: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB Connected successfully!');
    await mongoose.connection.close();
  } catch (err: any) {
    console.error('❌ MongoDB Connection Failed:');
    console.error(err.message);
  }

  // Test Redis
  console.log(`\nTesting Redis connection to: ${redisUrl.replace(/:([^:@]+)@/, ':****@')}`);
  try {
    const redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      // Add TLS if requested via URL protocol
      tls: redisUrl.startsWith('rediss://') ? {} : undefined
    });

    await new Promise((resolve, reject) => {
      redis.on('connect', () => {
        console.log('✅ Redis Connected successfully!');
        resolve(true);
      });
      redis.on('error', (err) => {
        reject(err);
      });
      setTimeout(() => reject(new Error('Redis connection timeout')), 6000);
    });
    
    redis.disconnect();
  } catch (err: any) {
    console.error('❌ Redis Connection Failed:');
    console.error(err.message);
  }

  process.exit(0);
}

testConnections();
