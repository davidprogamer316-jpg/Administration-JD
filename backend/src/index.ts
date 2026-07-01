import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import authRoutes from './modules/auth/routes/authRoutes';
import employeeRoutes from './modules/employees/routes/employeeRoutes';
import carJobRoutes from './modules/carJobs/routes/carJobRoutes';
import accountingRoutes from './modules/accounting/routes/accountingRoutes';
import invoiceRoutes from './modules/invoices/routes/invoiceRoutes';
import { errorHandler } from './shared/middleware/errorHandler';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.5.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/car-jobs', carJobRoutes);
app.use('/api/accounting', accountingRoutes);
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
