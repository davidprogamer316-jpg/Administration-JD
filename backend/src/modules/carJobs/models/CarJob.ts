import mongoose, { Schema, Document } from 'mongoose';

export interface ICarJob extends Document {
  date: Date;
  vin: string;
  description: string;
  payment: number;
  closed: boolean;
}

const CarJobSchema = new Schema<ICarJob>(
  {
    date: { type: Date, required: true },
    vin: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, required: true, trim: true },
    payment: { type: Number, required: true, min: 0 },
    closed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

CarJobSchema.index({ date: 1 });
CarJobSchema.index({ vin: 1 });

export const CarJob = mongoose.model<ICarJob>('CarJob', CarJobSchema);
