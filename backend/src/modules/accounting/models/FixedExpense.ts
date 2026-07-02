import mongoose, { Schema, Document } from 'mongoose';

export interface IFixedExpense extends Document {
  name: string;
  amount: number;
}

const FixedExpenseSchema = new Schema<IFixedExpense>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

export const FixedExpense = mongoose.model<IFixedExpense>(
  'FixedExpense',
  FixedExpenseSchema
);
