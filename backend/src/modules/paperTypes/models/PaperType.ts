import mongoose, { Schema, Document } from 'mongoose';

export interface IPaperType extends Document {
  code: string;
  label: string;
  specs: string;
  active: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const PaperTypeSchema = new Schema<IPaperType>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    specs: { type: String, default: '', trim: true },
    active: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PaperTypeSchema.index({ sortOrder: 1, label: 1 });

export const PaperType = mongoose.model<IPaperType>(
  'PaperType',
  PaperTypeSchema
);
