import { CarJob } from '../models/index.js';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { getQuincena, formatQuincena } from '../../../shared/utils/quincena.js';
import { recalculateById } from '../../accounting/services/accountingService.js';
import { Employee } from '../../employees/models/index.js';

async function ensureAccountingPeriod(date: Date) {
  const range = getQuincena(date);

  let period = await AccountingPeriod.findOne({
    periodStartDate: range.start,
  });

  if (!period) {
    period = await AccountingPeriod.create({
      periodStartDate: range.start,
      periodEndDate: range.end,
      periodNumber: range.periodNumber,
      income: 0,
      expenseItems: [],
      expenses: 0,
      fixedExpenses: [],
      dddg: 0,
      companyProfit: 0,
      netToDistribute: 0,
      employeeDistribution: [],
      bossAmount: 0,
      closed: false,
    });
  }

  return period;
}

async function snapshotEmployeeShares() {
  const employees = await Employee.find({ active: true }).sort({ name: 1 });
  return employees.map((emp) => ({
    employeeId: emp._id.toString(),
    employeeName: emp.name,
    percentage: emp.percentage,
  }));
}

export async function list(filters?: { startDate?: string; endDate?: string; vin?: string; includeInactive?: boolean }) {
  const query: Record<string, unknown> = {};

  if (!filters?.includeInactive) {
    query.active = { $ne: false };
  }

  if (filters?.startDate || filters?.endDate) {
    query.date = {};
    if (filters.startDate) {
      (query.date as Record<string, unknown>).$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      (query.date as Record<string, unknown>).$lte = new Date(filters.endDate);
    }
  }

  if (filters?.vin) {
    query.vin = { $regex: filters.vin, $options: 'i' };
  }

  return CarJob.find(query).sort({ date: -1 });
}

export interface QuincenaGroup {
  periodStartDate: string;
  periodEndDate: string;
  periodNumber: number;
  label: string;
  jobs: typeof CarJob.prototype[];
  totalJobs: number;
  totalPayment: number;
}

export async function listGrouped(filters?: { startDate?: string; endDate?: string; vin?: string }): Promise<QuincenaGroup[]> {
  const jobs = await list(filters);

  const groupsMap = new Map<string, Omit<QuincenaGroup, 'totalJobs' | 'totalPayment'> & { jobs: typeof CarJob.prototype[] }>();

  for (const job of jobs) {
    const range = getQuincena(job.date);
    const key = range.start.toISOString();

    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        periodStartDate: range.start.toISOString(),
        periodEndDate: range.end.toISOString(),
        periodNumber: range.periodNumber,
        label: formatQuincena(range),
        jobs: [],
      });
    }

    groupsMap.get(key)!.jobs.push(job);
  }

  const groups = Array.from(groupsMap.values());

  groups.sort((a, b) => new Date(b.periodStartDate).getTime() - new Date(a.periodStartDate).getTime());

  return groups.map((g) => ({
    ...g,
    totalJobs: g.jobs.length,
    totalPayment: Math.round(g.jobs.reduce((sum, j) => sum + j.payment, 0) * 100) / 100,
  }));
}

export async function getById(id: string) {
  const job = await CarJob.findById(id);
  if (!job) {
    throw Object.assign(new Error('Trabajo no encontrado'), { status: 404 });
  }
  return job;
}

export async function create(data: {
  date: string;
  vin: string;
  description: string;
  payment: number;
  paperTypes?: string[];
  paymentMethod?: string;
}) {
  const jobDate = new Date(data.date);

  const period = await ensureAccountingPeriod(jobDate);

  if (period.closed) {
    throw Object.assign(
      new Error('No se pueden agregar trabajos a un periodo cerrado'),
      { status: 400 }
    );
  }

  const cardSurcharge = data.paymentMethod === 'credito_debito'
    ? Math.round(data.payment * 0.036 * 100) / 100
    : 0;

  const job = await CarJob.create({
    date: jobDate,
    vin: data.vin,
    description: data.description,
    payment: Math.round(data.payment * 100) / 100,
    paperTypes: data.paperTypes || [],
    employeeShares: await snapshotEmployeeShares(),
    paymentMethod: data.paymentMethod || 'efectivo',
    cardSurcharge,
  });

  await recalculateById(period._id.toString());

  return job;
}

export async function update(
  id: string,
  data: { date?: string; vin?: string; description?: string; payment?: number; paperTypes?: string[]; paymentMethod?: string }
) {
  const job = await CarJob.findById(id);
  if (!job) {
    throw Object.assign(new Error('Trabajo no encontrado'), { status: 404 });
  }

  const newDate = data.date ? new Date(data.date) : job.date;
  const period = await ensureAccountingPeriod(newDate);

  if (period.closed) {
    throw Object.assign(
      new Error('No se pueden editar trabajos en un periodo cerrado'),
      { status: 400 }
    );
  }

  if (data.date) job.date = new Date(data.date);
  if (data.vin !== undefined) job.vin = data.vin;
  if (data.description !== undefined) job.description = data.description;
  if (data.payment !== undefined) job.payment = Math.round(data.payment * 100) / 100;
  if (data.paperTypes !== undefined) job.paperTypes = data.paperTypes;
  if (data.paymentMethod !== undefined) job.paymentMethod = data.paymentMethod;
  const effectivePayment = data.payment !== undefined ? data.payment : job.payment;
  const effectiveMethod = data.paymentMethod !== undefined ? data.paymentMethod : job.paymentMethod;
  job.cardSurcharge = effectiveMethod === 'credito_debito'
    ? Math.round(effectivePayment * 0.036 * 100) / 100
    : 0;
  job.employeeShares = await snapshotEmployeeShares();

  await job.save();

  const oldPeriod = getQuincena(job.date);
  const newPeriod = data.date ? getQuincena(new Date(data.date)) : oldPeriod;

  await recalculateById(period._id.toString());

  if (
    data.date &&
    (oldPeriod.start.getTime() !== newPeriod.start.getTime() ||
      oldPeriod.end.getTime() !== newPeriod.end.getTime())
  ) {
    const oldPeriodDoc = await AccountingPeriod.findOne({
      periodStartDate: oldPeriod.start,
    });
    if (oldPeriodDoc) {
      await recalculateById(oldPeriodDoc._id.toString());
    }
  }

  return job;
}

export async function deactivate(id: string) {
  const job = await CarJob.findById(id);
  if (!job) {
    throw Object.assign(new Error('Trabajo no encontrado'), { status: 404 });
  }

  const range = getQuincena(job.date);
  const period = await AccountingPeriod.findOne({
    periodStartDate: range.start,
  });

  if (period?.closed) {
    throw Object.assign(
      new Error('No se pueden desactivar trabajos de un periodo cerrado'),
      { status: 400 }
    );
  }

  job.active = false;
  await job.save();

  if (period) {
    await recalculateById(period._id.toString());
  }

  return { message: 'Trabajo desactivado' };
}
