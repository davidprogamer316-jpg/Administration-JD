import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import authRoutes from './modules/auth/routes/authRoutes.js';
import employeeRoutes from './modules/employees/routes/employeeRoutes.js';
import carJobRoutes from './modules/carJobs/routes/carJobRoutes.js';
import accountingRoutes from './modules/accounting/routes/accountingRoutes.js';
import fixedExpenseRoutes from './modules/accounting/routes/fixedExpenseRoutes.js';
import invoiceRoutes from './modules/invoices/routes/invoiceRoutes.js';
import { errorHandler } from './shared/middleware/errorHandler.js';

const app = express();

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
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.5.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/car-jobs', carJobRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/fixed-expenses', fixedExpenseRoutes);
app.use('/api/invoices', invoiceRoutes);

app.use(errorHandler);

async function start() {
  await connectDatabase();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

start().catch(console.error);

export default app;
