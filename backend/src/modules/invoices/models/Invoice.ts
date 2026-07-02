import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceItem {
  description: string;
  amount: number;
  carJobId?: string;
  paperTypes?: string[];
  date?: string;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  clientName: string;
  date: Date;
  items: IInvoiceItem[];
  total: number;
  notes: string;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    carJobId: { type: String },
    paperTypes: { type: [String], default: [] },
    date: { type: String },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    items: [InvoiceItemSchema],
    total: { type: Number, required: true, min: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ date: -1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
