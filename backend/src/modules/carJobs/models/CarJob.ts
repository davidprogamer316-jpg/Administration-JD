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
  paperTypes: string[];
  employeeShares: IEmployeeShare[];
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
    paperTypes: { type: [String], enum: ['premium', 'ceramic', 'ultra_ceramic'], default: [] },
    employeeShares: { type: [EmployeeShareSchema], default: [] },
  },
  { timestamps: true }
);

CarJobSchema.index({ date: 1 });
CarJobSchema.index({ vin: 1 });

export const CarJob = mongoose.model<ICarJob>('CarJob', CarJobSchema);
