import mongoose, { Schema, Document } from 'mongoose';

export interface IExpenseItem {
  _id?: string;
  description: string;
  amount: number;
}

export interface IEmployeeShare {
  employeeId: string;
  employeeName: string;
  percentageApplied: number;
  amount: number;
}

export interface IAccountingPeriod extends Document {
  periodStartDate: Date;
  periodEndDate: Date;
  periodNumber: number;
  income: number;
  expenseItems: IExpenseItem[];
  expenses: number;
  dddg: number;
  companyProfit: number;
  netToDistribute: number;
  employeeDistribution: IEmployeeShare[];
  bossAmount: number;
  closed: boolean;
}

const ExpenseItemSchema = new Schema<IExpenseItem>(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const EmployeeShareSchema = new Schema<IEmployeeShare>(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    percentageApplied: { type: Number, required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const AccountingPeriodSchema = new Schema<IAccountingPeriod>(
  {
    periodStartDate: { type: Date, required: true },
    periodEndDate: { type: Date, required: true },
    periodNumber: { type: Number, required: true, enum: [1, 2] },
    income: { type: Number, required: true, default: 0 },
    expenseItems: { type: [ExpenseItemSchema], default: [] },
    expenses: { type: Number, default: 0 },
    dddg: { type: Number, default: 0 },
    companyProfit: { type: Number, default: 0 },
    netToDistribute: { type: Number, default: 0 },
    employeeDistribution: { type: [EmployeeShareSchema], default: [] },
    bossAmount: { type: Number, default: 0 },
    closed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AccountingPeriodSchema.index({ periodStartDate: 1, periodEndDate: 1 }, { unique: true });
AccountingPeriodSchema.index({ periodNumber: 1 });

export const AccountingPeriod = mongoose.model<IAccountingPeriod>(
  'AccountingPeriod',
  AccountingPeriodSchema
);
