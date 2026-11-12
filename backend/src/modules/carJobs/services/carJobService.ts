import { CarJob } from '../models/index.js';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { getQuincena, formatQuincena } from '../../../shared/utils/quincena.js';
import { escapeRegex } from '../../../shared/utils/regex.js';
import { recalculateById } from '../../accounting/services/accountingService.js';
import { Employee } from '../../employees/models/index.js';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeJobType(value: unknown): 'vehicle' | 'property' {
  return value === 'property' ? 'property' : 'vehicle';
}

interface PropertyInputItem {
  ancho?: unknown;
  alto?: unknown;
  unidades?: unknown;
  nota?: unknown;
}

function buildPropertyItems(rawItems: unknown) {
  const list = Array.isArray(rawItems) ? rawItems : [];
  const items: Array<{
    ancho: number;
    alto: number;
    unidades: number;
    nota: string;
    sqFt: number;
  }> = [];

  for (const raw of list) {
    const item = (raw || {}) as PropertyInputItem;
    const ancho = Number(item.ancho);
    const alto = Number(item.alto);
    const unidades = Number(item.unidades);
    if (!(ancho > 0) || !(alto > 0) || !(unidades > 0)) continue;

    items.push({
      ancho,
      alto,
      unidades,
      nota: String(item.nota ?? '').trim().slice(0, 200),
      sqFt: round2((ancho * alto * unidades) / 144),
    });
  }

  if (items.length === 0) {
    throw Object.assign(new Error('Agrega al menos una medida válida'), {
      status: 400,
    });
  }

  return items;
}

interface JobPayload {
  date?: string;
  jobType?: unknown;
  vin?: unknown;
  address?: unknown;
  description?: unknown;
  payment?: unknown;
  items?: unknown;
  pricePerSqFt?: unknown;
  paperTypes?: string[];
  paymentMethod?: string;
}

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
    query.vin = { $regex: escapeRegex(String(filters.vin)), $options: 'i' };
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

export async function create(data: JobPayload) {
  const jobDate = new Date(String(data.date));

  const period = await ensureAccountingPeriod(jobDate);

  if (period.closed) {
    throw Object.assign(
      new Error('No se pueden agregar trabajos a un periodo cerrado'),
      { status: 400 }
    );
  }

  const jobType = normalizeJobType(data.jobType);
  const description = String(data.description ?? '').trim();
  if (!description) {
    throw Object.assign(new Error('La descripción es obligatoria'), {
      status: 400,
    });
  }

  let vin = '';
  let address = '';
  let items: ReturnType<typeof buildPropertyItems> = [];
  let totalSqFt = 0;
  let pricePerSqFt = 0;
  let payment = 0;

  if (jobType === 'property') {
    items = buildPropertyItems(data.items);
    pricePerSqFt = round2(Number(data.pricePerSqFt));
    if (!(pricePerSqFt > 0)) {
      throw Object.assign(
        new Error('El precio por pie cuadrado debe ser mayor a 0'),
        { status: 400 }
      );
    }
    totalSqFt = round2(items.reduce((sum, item) => sum + item.sqFt, 0));
    payment = round2(totalSqFt * pricePerSqFt);
    address = String(data.address ?? '').trim();
  } else {
    vin = String(data.vin ?? '').trim().toUpperCase();
    if (!vin) {
      throw Object.assign(new Error('El VIN es obligatorio'), { status: 400 });
    }
    payment = round2(Number(data.payment));
    if (!(payment >= 0)) {
      throw Object.assign(new Error('El pago no es válido'), { status: 400 });
    }
  }

  const cardSurcharge =
    data.paymentMethod === 'credito_debito' ? round2(payment * 0.036) : 0;

  const job = await CarJob.create({
    date: jobDate,
    jobType,
    vin,
    address,
    description,
    payment,
    items,
    totalSqFt,
    pricePerSqFt,
    paperTypes: data.paperTypes || [],
    employeeShares: await snapshotEmployeeShares(),
    paymentMethod: data.paymentMethod || 'efectivo',
    cardSurcharge,
  });

  await recalculateById(period._id.toString());

  return job;
}

export async function update(id: string, data: JobPayload) {
  const job = await CarJob.findById(id);
  if (!job) {
    throw Object.assign(new Error('Trabajo no encontrado'), { status: 404 });
  }

  const previousDate = job.date;
  const newDate = data.date ? new Date(data.date) : job.date;
  const period = await ensureAccountingPeriod(newDate);

  if (period.closed) {
    throw Object.assign(
      new Error('No se pueden editar trabajos en un periodo cerrado'),
      { status: 400 }
    );
  }

  const jobType = normalizeJobType(data.jobType ?? job.jobType);
  const description =
    data.description !== undefined
      ? String(data.description).trim()
      : job.description;
  if (!description) {
    throw Object.assign(new Error('La descripción es obligatoria'), {
      status: 400,
    });
  }

  let vin = '';
  let address = '';
  let items: ReturnType<typeof buildPropertyItems> = [];
  let totalSqFt = 0;
  let pricePerSqFt = 0;
  let payment = 0;

  if (jobType === 'property') {
    items = buildPropertyItems(
      data.items !== undefined ? data.items : job.items
    );
    pricePerSqFt = round2(
      Number(data.pricePerSqFt !== undefined ? data.pricePerSqFt : job.pricePerSqFt)
    );
    if (!(pricePerSqFt > 0)) {
      throw Object.assign(
        new Error('El precio por pie cuadrado debe ser mayor a 0'),
        { status: 400 }
      );
    }
    totalSqFt = round2(items.reduce((sum, item) => sum + item.sqFt, 0));
    payment = round2(totalSqFt * pricePerSqFt);
    address = String(data.address !== undefined ? data.address : job.address ?? '').trim();
  } else {
    vin = String(data.vin !== undefined ? data.vin : job.vin ?? '').trim().toUpperCase();
    if (!vin) {
      throw Object.assign(new Error('El VIN es obligatorio'), { status: 400 });
    }
    payment = round2(Number(data.payment !== undefined ? data.payment : job.payment));
    if (!(payment >= 0)) {
      throw Object.assign(new Error('El pago no es válido'), { status: 400 });
    }
  }

  if (data.date) job.date = newDate;
  job.jobType = jobType;
  job.vin = vin;
  job.address = address;
  job.items = items;
  job.totalSqFt = totalSqFt;
  job.pricePerSqFt = pricePerSqFt;
  job.description = description;
  job.payment = payment;
  if (data.paperTypes !== undefined) job.paperTypes = data.paperTypes;
  if (data.paymentMethod !== undefined) job.paymentMethod = data.paymentMethod;

  const effectiveMethod =
    data.paymentMethod !== undefined ? data.paymentMethod : job.paymentMethod;
  job.cardSurcharge =
    effectiveMethod === 'credito_debito' ? round2(payment * 0.036) : 0;
  job.employeeShares = await snapshotEmployeeShares();

  await job.save();

  const oldPeriod = getQuincena(previousDate);
  const newPeriod = getQuincena(job.date);

  await recalculateById(period._id.toString());

  if (
    oldPeriod.start.getTime() !== newPeriod.start.getTime() ||
    oldPeriod.end.getTime() !== newPeriod.end.getTime()
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
