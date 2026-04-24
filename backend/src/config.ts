import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000'),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/veda-assessment',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  groqApiKey: process.env.GROQ_API_KEY || '',
  googleApiKey: process.env.GEMINI_API_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
};
