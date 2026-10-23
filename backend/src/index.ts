import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { connectDatabase, isDbConnected } from './config/database.js';
import { sanitizeInput } from './shared/middleware/sanitize.js';
import authRoutes from './modules/auth/routes/authRoutes.js';
import employeeRoutes from './modules/employees/routes/employeeRoutes.js';
import carJobRoutes from './modules/carJobs/routes/carJobRoutes.js';
import accountingRoutes from './modules/accounting/routes/accountingRoutes.js';
import fixedExpenseRoutes from './modules/accounting/routes/fixedExpenseRoutes.js';
import invoiceRoutes from './modules/invoices/routes/invoiceRoutes.js';
import quoteRoutes from './modules/quotes/routes/index.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    if (env.allowVercelPreviews && origin.endsWith('.vercel.app')) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(sanitizeInput);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Demasiados intentos. Intenta de nuevo más tarde.' },
});
app.use('/api/auth/login', loginLimiter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.5.0', db: isDbConnected() ? 'up' : 'down' });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/car-jobs', carJobRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/fixed-expenses', fixedExpenseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/quotes', quoteRoutes);

app.use(errorHandler);

async function start() {
  if (
    process.env.NODE_ENV === 'production' &&
    env.jwtSecret === 'dev-secret-change-in-production'
  ) {
    console.error(
      'FATAL: JWT_SECRET no está configurado. Define un secreto seguro antes de iniciar en producción.'
    );
    process.exit(1);
  }

  await connectDatabase();

  app.listen(env.port, env.host, () => {
    console.log(`Server running on ${env.host}:${env.port}`);
  });
}

start().catch(console.error);

export default app;
