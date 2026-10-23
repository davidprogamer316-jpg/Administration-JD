import mongoose from 'mongoose';
import { env } from './env.js';
import { seedDefaultPaperTypes } from '../modules/paperTypes/seed.js';

let retryTimer: NodeJS.Timeout | null = null;

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

async function connectOnce(attempt: number): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  try {
    await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
    try {
      await seedDefaultPaperTypes();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Paper type seed failed: ${msg}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`MongoDB connection error (attempt ${attempt}): ${msg}`);
    scheduleRetry(attempt);
  }
}

function scheduleRetry(attempt: number): void {
  if (retryTimer) return;
  const delay = Math.min(3000 * attempt, 20000);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void connectOnce(attempt + 1);
  }, delay);
}

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('error', (err) => {
    console.error('MongoDB runtime error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
    scheduleRetry(1);
  });

  await connectOnce(1);
}
