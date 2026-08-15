import mongoose, { Schema, Document } from 'mongoose';

export interface IQuoteItem {
  ancho: number;
  alto: number;
  unidades: number;
  nota?: string;
  sqFt: number;
}

export interface IQuote extends Document {
  quoteNumber: string;
  clientName: string;
  date: Date;
  items: IQuoteItem[];
  totalSqFt: number;
  pricePerSqFt: number;
  total: number;
}

const QuoteItemSchema = new Schema<IQuoteItem>(
  {
    ancho: { type: Number, required: true, min: 0 },
    alto: { type: Number, required: true, min: 0 },
    unidades: { type: Number, required: true, min: 1 },
    nota: { type: String, default: '', trim: true },
    sqFt: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuoteSchema = new Schema<IQuote>(
  {
    quoteNumber: { type: String, required: true, unique: true },
    clientName: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    items: [QuoteItemSchema],
    totalSqFt: { type: Number, required: true, min: 0 },
    pricePerSqFt: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
);

QuoteSchema.index({ quoteNumber: 1 });
QuoteSchema.index({ date: -1 });

export const Quote = mongoose.model<IQuote>('Quote', QuoteSchema);
