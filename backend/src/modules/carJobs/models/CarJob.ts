import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeShare {
  employeeId: string;
  employeeName: string;
  percentage: number;
}

export interface ICarJob extends Document {
  date: Date;
  vin: string;
  description: string;
  payment: number;
  closed: boolean;
  active: boolean;
  paperTypes: string[];
  employeeShares: IEmployeeShare[];
  paymentMethod?: string;
  cardSurcharge: number;
}

const EmployeeShareSchema = new Schema<IEmployeeShare>(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const CarJobSchema = new Schema<ICarJob>(
  {
    date: { type: Date, required: true },
    vin: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: true, trim: true },
    payment: { type: Number, required: true, min: 0 },
    closed: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    paperTypes: { type: [String], enum: ['premium', 'ceramic', 'ultra_ceramic', 'architectural_black', 'architectural_silver', 'ceramica_d'], default: [] },
    employeeShares: { type: [EmployeeShareSchema], default: [] },
    paymentMethod: { type: String, enum: ['efectivo', 'credito_debito', 'transferencia'], default: 'efectivo' },
    cardSurcharge: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

CarJobSchema.index({ date: 1 });
CarJobSchema.index({ vin: 1 });

export const CarJob = mongoose.model<ICarJob>('CarJob', CarJobSchema);
