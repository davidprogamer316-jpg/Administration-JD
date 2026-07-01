import { CarJob } from '../models/index.js';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { getQuincena } from '../../../shared/utils/quincena.js';
import { recalculateById } from '../../accounting/services/accountingService.js';

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

export async function list(filters?: { startDate?: string; endDate?: string; vin?: string }) {
  const query: Record<string, unknown> = {};

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
}) {
  const jobDate = new Date(data.date);

  const period = await ensureAccountingPeriod(jobDate);

  if (period.closed) {
    throw Object.assign(
      new Error('No se pueden agregar trabajos a un periodo cerrado'),
      { status: 400 }
    );
  }

  const job = await CarJob.create({
    date: jobDate,
    vin: data.vin,
    description: data.description,
    payment: data.payment,
  });

  await recalculateById(period._id.toString());

  return job;
}

export async function update(
  id: string,
  data: { date?: string; vin?: string; description?: string; payment?: number }
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
  if (data.payment !== undefined) job.payment = data.payment;

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

export async function remove(id: string) {
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
      new Error('No se pueden eliminar trabajos de un periodo cerrado'),
      { status: 400 }
    );
  }

  await CarJob.deleteOne({ _id: id });

  if (period) {
    await recalculateById(period._id.toString());
  }

  return { message: 'Trabajo eliminado' };
}
