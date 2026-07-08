import { AccountingPeriod, FixedExpense, IAccountingPeriod } from '../models/index.js';
import { CarJob } from '../../carJobs/models/index.js';
import { env } from '../../../config/env.js';

async function recalculate(period: IAccountingPeriod) {
  const jobs = await CarJob.find({
    date: { $gte: period.periodStartDate, $lte: period.periodEndDate },
  });
  period.income = Math.round(jobs.reduce((sum, j) => sum + j.payment, 0) * 100) / 100;

  // Auto-compute fixed expense halves
  const fixedExpenses = await FixedExpense.find();
  period.fixedExpenses = fixedExpenses.map((fe) => ({
    name: fe.name,
    amount: Math.round((fe.amount / 2) * 100) / 100,
  }));

  const fixedTotal = period.fixedExpenses.reduce((sum, fe) => sum + fe.amount, 0);
  period.expenses =
    Math.round((period.expenseItems.reduce((sum, item) => sum + item.amount, 0) + fixedTotal) * 100) / 100;

  period.dddg = Math.max(0, Math.round((period.income - period.expenses) * 100) / 100);

  if (period.dddg > 0) {
    period.companyProfit = Math.round(period.dddg * env.companyProfitRate * 100) / 100;
  } else {
    period.companyProfit = 0;
  }

  period.netToDistribute = Math.round((period.dddg - period.companyProfit) * 100) / 100;

  // Aggregate employee earnings per job using each job's snapshot
  const empMap = new Map<string, { name: string; percentage: number; amount: number }>();
  const totalIncome = period.income;

  for (const job of jobs) {
    if (totalIncome <= 0 || !job.employeeShares?.length) continue;
    for (const share of job.employeeShares) {
      const empId = share.employeeId;
      const proportionalAmount = period.netToDistribute * (share.percentage / 100) * (job.payment / totalIncome);
      if (empMap.has(empId)) {
        empMap.get(empId)!.amount += proportionalAmount;
      } else {
        empMap.set(empId, { name: share.employeeName, percentage: share.percentage, amount: proportionalAmount });
      }
    }
  }

  period.employeeDistribution = Array.from(empMap.entries()).map(([employeeId, data]) => ({
    employeeId,
    employeeName: data.name,
    percentageApplied: data.percentage,
    amount: Math.round(data.amount * 100) / 100,
  }));

  const totalDistributed = period.employeeDistribution.reduce(
    (sum, e) => sum + e.amount,
    0
  );
  period.bossAmount = Math.round((period.netToDistribute - totalDistributed) * 100) / 100;

  return period.save();
}

export async function list(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  const query: Record<string, unknown> = {};

  if (filters?.startDate || filters?.endDate) {
    query.periodStartDate = {};
    if (filters.startDate) {
      (query.periodStartDate as Record<string, unknown>).$gte = new Date(
        filters.startDate
      );
    }
    if (filters.endDate) {
      (query.periodStartDate as Record<string, unknown>).$lte = new Date(
        filters.endDate
      );
    }
  }

  return AccountingPeriod.find(query).sort({ periodStartDate: -1 });
}

export async function getById(id: string) {
  const period = await AccountingPeriod.findById(id);
  if (!period) {
    throw Object.assign(new Error('Periodo no encontrado'), { status: 404 });
  }

  const jobs = await CarJob.find({
    date: { $gte: period.periodStartDate, $lte: period.periodEndDate },
  }).sort({ date: -1 });

  return { period, jobs };
}

export async function addExpenseItem(
  periodId: string,
  data: { description: string; amount: number }
) {
  const period = await AccountingPeriod.findById(periodId);
  if (!period) {
    throw Object.assign(new Error('Periodo no encontrado'), { status: 404 });
  }
  if (period.closed) {
    throw Object.assign(
      new Error('No se pueden modificar gastos de un periodo cerrado'),
      { status: 400 }
    );
  }

  period.expenseItems.push(data);
  await recalculate(period);
  return period;
}

export async function updateExpenseItem(
  periodId: string,
  itemId: string,
  data: { description?: string; amount?: number }
) {
  const period = await AccountingPeriod.findById(periodId);
  if (!period) {
    throw Object.assign(new Error('Periodo no encontrado'), { status: 404 });
  }
  if (period.closed) {
    throw Object.assign(
      new Error('No se pueden modificar gastos de un periodo cerrado'),
      { status: 400 }
    );
  }

  const item = (period.expenseItems as any).id(itemId);
  if (!item) {
    throw Object.assign(new Error('Ítem de gasto no encontrado'), {
      status: 404,
    });
  }

  if (data.description !== undefined) item.description = data.description;
  if (data.amount !== undefined) item.amount = data.amount;

  await recalculate(period);
  return period;
}

export async function removeExpenseItem(periodId: string, itemId: string) {
  const period = await AccountingPeriod.findById(periodId);
  if (!period) {
    throw Object.assign(new Error('Periodo no encontrado'), { status: 404 });
  }
  if (period.closed) {
    throw Object.assign(
      new Error('No se pueden modificar gastos de un periodo cerrado'),
      { status: 400 }
    );
  }

  const item = (period.expenseItems as any).id(itemId);
  if (!item) {
    throw Object.assign(new Error('Ítem de gasto no encontrado'), {
      status: 404,
    });
  }

  item.deleteOne();
  await recalculate(period);
  return period;
}

export async function closePeriod(periodId: string) {
  const period = await AccountingPeriod.findById(periodId);
  if (!period) {
    throw Object.assign(new Error('Periodo no encontrado'), { status: 404 });
  }

  if (period.closed) {
    throw Object.assign(new Error('El periodo ya está cerrado'), {
      status: 400,
    });
  }

  period.closed = true;

  await CarJob.updateMany(
    {
      date: { $gte: period.periodStartDate, $lte: period.periodEndDate },
    },
    { closed: true }
  );

  await period.save();
  return period;
}

export async function recalculateAllOpen() {
  const openPeriods = await AccountingPeriod.find({ closed: false });
  const results = await Promise.all(
    openPeriods.map((p) => recalculate(p))
  );
  return results;
}

export async function recalculateById(periodId: string) {
  const period = await AccountingPeriod.findById(periodId);
  if (!period) {
    throw Object.assign(new Error('Periodo no encontrado'), { status: 404 });
  }
  if (period.closed) {
    throw Object.assign(
      new Error('No se puede recalcular un periodo cerrado'),
      { status: 400 }
    );
  }

  return recalculate(period);
}
