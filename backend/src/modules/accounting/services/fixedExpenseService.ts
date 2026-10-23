import { FixedExpense, IFixedExpense } from '../models/index.js';

export async function list() {
  return FixedExpense.find().sort({ name: 1 });
}

export async function create(data: { name: string; amount: number }) {
  return FixedExpense.create({ name: data.name, amount: data.amount });
}

export async function update(id: string, data: { name?: string; amount?: number }) {
  const patch: { name?: string; amount?: number } = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.amount !== undefined) patch.amount = data.amount;

  const fe = await FixedExpense.findByIdAndUpdate(id, patch, {
    new: true,
    runValidators: true,
  });
  if (!fe) {
    throw Object.assign(new Error('Gasto fijo no encontrado'), { status: 404 });
  }
  return fe;
}

export async function remove(id: string) {
  const fe = await FixedExpense.findByIdAndDelete(id);
  if (!fe) {
    throw Object.assign(new Error('Gasto fijo no encontrado'), { status: 404 });
  }
  return { message: 'Gasto fijo eliminado' };
}
