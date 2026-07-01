import { Employee, IEmployee } from '../models';
import { AccountingPeriod } from '../../accounting/models';
import { env } from '../../../config/env';

async function recalculateOpenPeriods() {
  const openPeriods = await AccountingPeriod.find({ closed: false });
  const CarJob = (await import('../../carJobs/models')).CarJob;
  const EmployeeModel = Employee;

  for (const period of openPeriods) {
    const jobs = await CarJob.find({
      date: { $gte: period.periodStartDate, $lte: period.periodEndDate },
    });
    period.income = jobs.reduce((sum, j) => sum + j.payment, 0);

    period.expenses = period.expenseItems.reduce((s, i) => s + i.amount, 0);
    period.dddg = Math.max(0, period.income - period.expenses);

    if (period.dddg > 0) {
      period.companyProfit = period.dddg * env.companyProfitRate;
    } else {
      period.companyProfit = 0;
    }

    period.netToDistribute = period.dddg - period.companyProfit;

    const activeEmployees = await EmployeeModel.find({ active: true }).sort({
      name: 1,
    });
    period.employeeDistribution = activeEmployees.map((emp) => ({
      employeeId: emp._id.toString(),
      employeeName: emp.name,
      percentageApplied: emp.percentage,
      amount: period.netToDistribute * (emp.percentage / 100),
    }));

    const totalDistributed = period.employeeDistribution.reduce(
      (s, e) => s + e.amount,
      0
    );
    period.bossAmount = period.netToDistribute - totalDistributed;

    await period.save();
  }
}

export async function list() {
  const employees = await Employee.find().sort({ name: 1 });
  const totalPercentage = employees
    .filter((e) => e.active)
    .reduce((sum, e) => sum + e.percentage, 0);

  return {
    employees,
    bossPercentage: Math.max(0, 100 - totalPercentage),
    totalActivePercentage: totalPercentage,
  };
}

export async function getById(id: string) {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw Object.assign(new Error('Empleado no encontrado'), { status: 404 });
  }
  return employee;
}

export async function create(data: { name: string; percentage: number }) {
  const activeEmployees = await Employee.find({ active: true });
  const currentSum = activeEmployees.reduce((s, e) => s + e.percentage, 0);

  if (currentSum + data.percentage > 100) {
    throw Object.assign(
      new Error(
        `La suma de porcentajes no puede superar el 100%. Actual: ${currentSum}%, disponible: ${100 - currentSum}%`
      ),
      { status: 400 }
    );
  }

  const employee = await Employee.create(data);
  await recalculateOpenPeriods();
  return employee;
}

export async function update(
  id: string,
  data: { name?: string; percentage?: number }
) {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw Object.assign(new Error('Empleado no encontrado'), { status: 404 });
  }

  const newPercentage = data.percentage ?? employee.percentage;

  if (data.percentage !== undefined && data.percentage !== employee.percentage) {
    const activeEmployees = await Employee.find({ active: true, _id: { $ne: id } });
    const currentSum = activeEmployees.reduce((s, e) => s + e.percentage, 0);

    if (currentSum + newPercentage > 100) {
      throw Object.assign(
        new Error(
          `La suma de porcentajes no puede superar el 100%. Actual sin este empleado: ${currentSum}%, disponible: ${100 - currentSum}%`
        ),
        { status: 400 }
      );
    }
  }

  if (data.name !== undefined) employee.name = data.name;
  if (data.percentage !== undefined) employee.percentage = data.percentage;

  const saved = await employee.save();
  await recalculateOpenPeriods();
  return saved;
}

export async function toggleActive(id: string) {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw Object.assign(new Error('Empleado no encontrado'), { status: 404 });
  }

  employee.active = !employee.active;
  const saved = await employee.save();
  await recalculateOpenPeriods();
  return saved;
}

export async function remove(id: string) {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw Object.assign(new Error('Empleado no encontrado'), { status: 404 });
  }

  await Employee.deleteOne({ _id: id });
  await recalculateOpenPeriods();
  return { message: 'Empleado eliminado' };
}
