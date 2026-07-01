import { AccountingPeriod } from '../models';
import { Employee } from '../../employees/models';
import { CarJob } from '../../carJobs/models';

export async function getDashboard(filters?: {
  startDate?: string;
  endDate?: string;
}) {
  const query: Record<string, unknown> = {};
  if (filters?.startDate || filters?.endDate) {
    query.periodStartDate = {};
    if (filters.startDate) {
      (query.periodStartDate as Record<string, unknown>).$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      (query.periodStartDate as Record<string, unknown>).$lte = new Date(filters.endDate);
    }
  }

  const periods = await AccountingPeriod.find(query).sort({ periodStartDate: 1 });

  const totals = {
    income: 0,
    expenses: 0,
    dddg: 0,
    companyProfit: 0,
    netToDistribute: 0,
    bossAmount: 0,
  };

  const employeeTotals: Record<string, { name: string; total: number }> = {};

  for (const p of periods) {
    totals.income += p.income;
    totals.expenses += p.expenses;
    totals.dddg += p.dddg;
    totals.companyProfit += p.companyProfit;
    totals.netToDistribute += p.netToDistribute;
    totals.bossAmount += p.bossAmount;

    for (const share of p.employeeDistribution) {
      if (!employeeTotals[share.employeeId]) {
        employeeTotals[share.employeeId] = {
          name: share.employeeName,
          total: 0,
        };
      }
      employeeTotals[share.employeeId].total += share.amount;
    }
  }

  const chartData = periods.map((p) => ({
    label: `Q${p.periodNumber} ${p.periodStartDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`,
    income: p.income,
    expenses: p.expenses,
    companyProfit: p.companyProfit,
  }));

  const employeeCount = await Employee.countDocuments({ active: true });
  const carJobCount = await CarJob.countDocuments(
    filters?.startDate || filters?.endDate
      ? {
          date: {
            ...(filters.startDate ? { $gte: new Date(filters.startDate) } : {}),
            ...(filters.endDate ? { $lte: new Date(filters.endDate) } : {}),
          },
        }
      : {}
  );

  return {
    totals,
    employeeTotals: Object.entries(employeeTotals).map(([id, data]) => ({
      employeeId: id,
      ...data,
    })),
    chartData,
    employeeCount,
    carJobCount,
    periodCount: periods.length,
  };
}
