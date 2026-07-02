import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/tinting-jd?retryWrites=true&w=majority',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  loginMaxAttempts: parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10),
  loginLockDurationMinutes: parseInt(process.env.LOGIN_LOCK_DURATION_MINUTES || '30', 10),
  companyProfitRate: parseFloat(process.env.COMPANY_PROFIT_RATE || '0.20'),
  corsOrigins: (() => {
    const raw = process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || 'http://localhost:3000';
    return raw.split(',').map((s) => {
      try { return new URL(s.trim()).origin; } catch { return s.trim(); }
    }).filter(Boolean);
  })(),
  allowVercelPreviews: process.env.CORS_ALLOW_VERCEL_PREVIEWS !== 'false',
};
