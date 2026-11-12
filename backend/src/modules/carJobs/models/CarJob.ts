import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeShare {
  employeeId: string;
  employeeName: string;
  percentage: number;
}

export interface ICarJobItem {
  ancho: number;
  alto: number;
  unidades: number;
  nota?: string;
  sqFt: number;
}

export type JobType = 'vehicle' | 'property';

export interface ICarJob extends Document {
  date: Date;
  jobType: JobType;
  vin?: string;
  address?: string;
  description: string;
  payment: number;
  items: ICarJobItem[];
  totalSqFt: number;
  pricePerSqFt: number;
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

const CarJobItemSchema = new Schema<ICarJobItem>(
  {
    ancho: { type: Number, required: true, min: 0 },
    alto: { type: Number, required: true, min: 0 },
    unidades: { type: Number, required: true, min: 1 },
    nota: { type: String, default: '', trim: true },
    sqFt: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CarJobSchema = new Schema<ICarJob>(
  {
    date: { type: Date, required: true },
    jobType: {
      type: String,
      enum: ['vehicle', 'property'],
      default: 'vehicle',
    },
    vin: { type: String, trim: true, uppercase: true, default: '' },
    address: { type: String, trim: true, default: '' },
    description: { type: String, required: true, trim: true },
    payment: { type: Number, required: true, min: 0 },
    items: { type: [CarJobItemSchema], default: [] },
    totalSqFt: { type: Number, default: 0, min: 0 },
    pricePerSqFt: { type: Number, default: 0, min: 0 },
    closed: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    paperTypes: { type: [String], default: [] },
    employeeShares: { type: [EmployeeShareSchema], default: [] },
    paymentMethod: { type: String, enum: ['efectivo', 'credito_debito', 'transferencia'], default: 'efectivo' },
    cardSurcharge: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

CarJobSchema.index({ date: 1 });
CarJobSchema.index({ vin: 1 });

export const CarJob = mongoose.model<ICarJob>('CarJob', CarJobSchema);
