import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { Invoice } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANY_NAME = 'Windows Tinting JD';
const COMPANY_TAGLINE = 'Mobile tinting service — we come to you';
const COMPANY_PHONE = '786 793 4440';
const COMPANY_URL = 'https://tinting-film.com';

const LOGO_PATH = path.join(__dirname, '../../../../assets/logo.PNG');
const QR_SIZE = 72;

const PAPER_INFO: Record<string, { label: string; specs: string }> = {
  premium: {
    label: 'Premium Film',
    specs: 'Solar rejection: 40%, UV protection: 90%, Warranty: 6 months',
  },
  ceramic: {
    label: 'Ceramic Film',
    specs: 'Solar rejection: 70%, UV protection: 100%, Warranty: 5 years',
  },
  ultra_ceramic: {
    label: 'Ultra Ceramic Film',
    specs: 'Solar rejection: 99%, UV protection: 100%, Warranty: 10 years',
  },
};

function formatMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export async function list() {
  return Invoice.find().sort({ date: -1 });
}

export async function getById(id: string) {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw Object.assign(new Error('Factura no encontrada'), { status: 404 });
  }
  return invoice;
}

export async function create(data: {
  clientName: string;
  items: Array<{ description: string; amount: number; carJobId?: string; paperTypes?: string[]; date?: string }>;
  notes?: string;
}) {
  const count = await Invoice.countDocuments();
  const invoiceNumber = `FAC-${String(count + 1).padStart(4, '0')}`;

  const total = data.items.reduce((sum, item) => sum + item.amount, 0);

  const invoice = await Invoice.create({
    invoiceNumber,
    clientName: data.clientName,
    items: data.items,
    total,
    notes: data.notes || '',
  });

  return invoice;
}

export async function remove(id: string) {
  const invoice = await Invoice.findByIdAndDelete(id);
  if (!invoice) {
    throw Object.assign(new Error('Factura no encontrada'), { status: 404 });
  }
  return { message: 'Factura eliminada' };
}

export async function generatePdf(id: string): Promise<Buffer> {
  const invoice = await Invoice.findById(id);
  if (!invoice) {
    throw Object.assign(new Error('Factura no encontrada'), { status: 404 });
  }

  // ── Layout constants (80 mm thermal‑receipt style) ──
  const PAGE_W = 302;
  const MARGIN = 8;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const LEFT = MARGIN;
  const RIGHT = PAGE_W - MARGIN;

  // Column split for items
  const PRICE_W = 100;
  const DESC_W = CONTENT_W - PRICE_W;
  const PRICE_X = LEFT + DESC_W;

  // ── Estimate vertical space needed so the page is not taller than necessary ──
  // We use simple heuristics based on font size and character count.
  function textH(text: string, w: number, fs: number): number {
    const avgCharW = fs * 0.56;
    const cpl = Math.max(1, Math.floor(w / avgCharW));
    const lines = Math.max(1, Math.ceil(text.length / cpl));
    return lines * fs * 1.35;
  }

  let pageH = MARGIN;
  // Logo area
  pageH += 56;
  // Company header (name + tagline + phone)
  pageH += 18 + 2 + textH(COMPANY_TAGLINE, CONTENT_W, 8) + 4 + textH(`Tel: ${COMPANY_PHONE}`, CONTENT_W, 9);
  // Separator
  pageH += 14;
  // Invoice title + number + date
  pageH += 16 + 4 + 22 + 4 + textH(`Fecha: ${formatDate(invoice.date)}`, CONTENT_W, 9);
  // Separator
  pageH += 14;
  // Client
  pageH += 12 + 2 + textH(invoice.clientName, CONTENT_W, 11) + 2;
  // Separator
  pageH += 12;
  // Table header
  pageH += 18;
  // Items
  for (const item of invoice.items) {
    const itemH = Math.max(18, textH(item.description, DESC_W, 10) + 4);
    let paperH = 0;
    if (item.date) {
      paperH += textH(`Date: ${item.date}`, CONTENT_W, 7) + 1;
    }
    if (item.paperTypes && item.paperTypes.length > 0) {
      for (const pt of item.paperTypes) {
        const info = PAPER_INFO[pt];
        if (info) {
          paperH += textH(`${info.label} — ${info.specs}`, CONTENT_W, 7) + 1;
        }
      }
    }
    pageH += itemH + paperH;
  }
  // Total
  pageH += 4 + 28;
  // Separator
  pageH += 14;
  // Warranty
  pageH += textH(
    'Warranty applies per the specifications listed above for each ' +
    'installed film type. This document certifies the completion of the ' +
    'safety film installation service.',
    CONTENT_W, 8
  ) + 4;
  // Footer
  pageH += textH(
    `Generated on ${formatDate(new Date())} by ${COMPANY_NAME}.`,
    CONTENT_W, 8
  );
  // QR code
  pageH += 12 + QR_SIZE + 8;
  pageH = Math.ceil(pageH * 1.25) + MARGIN;

  const doc = new PDFDocument({ size: [PAGE_W, pageH], margin: MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = MARGIN;

    // ── Logo ──
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, (PAGE_W - 50) / 2, y, { width: 50 });
      y += 50;
    }

    // ── Company header (centred) ──
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#000');
    doc.text(COMPANY_NAME, LEFT, y, { align: 'center', width: CONTENT_W });
    y += 18;

    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666');
    doc.text(COMPANY_TAGLINE, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(COMPANY_TAGLINE, CONTENT_W, 8) + 4;

    doc.fontSize(9).font('Helvetica').fillColor('#444');
    doc.text(`Tel: ${COMPANY_PHONE}`, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(`Tel: ${COMPANY_PHONE}`, CONTENT_W, 9) + 2;

    // ── Divider ──
    y += 2;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#CCC').lineWidth(0.5).stroke();
    y += 8;

    // ── Invoice title + number + date ──
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
    doc.text('INVOICE', LEFT, y, { align: 'center', width: CONTENT_W });
    y += 16;

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#D4A84B');
    doc.text(invoice.invoiceNumber, LEFT, y, { align: 'center', width: CONTENT_W });
    y += 22;

    doc.fontSize(9).font('Helvetica').fillColor('#666');
    doc.text(`Date: ${formatDate(invoice.date)}`, LEFT, y, { align: 'center', width: CONTENT_W });
    y += 14;

    // ── Divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#CCC').lineWidth(0.5).stroke();
    y += 8;

    // ── Client ──
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#666');
    doc.text('CUSTOMER', LEFT, y);
    y += 12;

    doc.fontSize(11).font('Helvetica').fillColor('#000');
    doc.text(invoice.clientName, LEFT, y);
    y += textH(invoice.clientName, CONTENT_W, 11) + 2;

    // ── Divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#CCC').lineWidth(0.5).stroke();
    y += 8;

    // ── Table header ──
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#000');
    doc.text('SERVICE', LEFT, y, { width: DESC_W });
    doc.text('AMOUNT', PRICE_X, y, { width: PRICE_W, align: 'right' });
    y += 16;

    // ── Table rows ──
    for (const item of invoice.items) {
      doc.fontSize(10).font('Helvetica').fillColor('#000');
      const descH = doc.heightOfString(item.description, { width: DESC_W });
      let rowH = Math.max(18, descH + 4);

      doc.text(item.description, LEFT, y + 2, { width: DESC_W });
      doc.text(formatMoney(item.amount), PRICE_X, y + 2, { width: PRICE_W, align: 'right' });

      y += rowH;

      if (item.date) {
        doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666');
        const dateText = `Date: ${formatDate(new Date(item.date))}`;
        const dateH = doc.heightOfString(dateText, { width: CONTENT_W });
        doc.text(dateText, LEFT, y, { width: CONTENT_W });
        y += dateH + 1;
      }

      if (item.paperTypes && item.paperTypes.length > 0) {
        doc.fontSize(7).font('Helvetica-Oblique').fillColor('#666');
        for (const pt of item.paperTypes) {
          const info = PAPER_INFO[pt];
          if (!info) continue;
          const text = `${info.label} — ${info.specs}`;
          const h = doc.heightOfString(text, { width: CONTENT_W });
          doc.text(text, LEFT, y, { width: CONTENT_W });
          y += h + 1;
        }
      }
    }

    // ── Total ──
    y += 2;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#000').lineWidth(1).stroke();
    y += 8;

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000');
    doc.text('TOTAL', LEFT, y);
    doc.text(formatMoney(invoice.total), PRICE_X, y, { width: PRICE_W, align: 'right' });
    y += 24;

    // ── Divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#CCC').lineWidth(0.5).stroke();
    y += 8;

    // ── Warranty text (centred) ──
    doc.fontSize(8).font('Helvetica-Oblique').fillColor('#666');
    const warrantyText =
      'Warranty applies per the specifications listed above for each ' +
      'installed film type. This document certifies the completion of the ' +
      'safety film installation service.';
    doc.text(warrantyText, LEFT, y, { width: CONTENT_W, align: 'center' });
    y += doc.heightOfString(warrantyText, { width: CONTENT_W }) + 4;

    // ── Footer ──
    doc.fontSize(7).font('Helvetica').fillColor('#999');
    const footerText = `Generated on ${formatDate(new Date())} by ${COMPANY_NAME}.`;
    doc.text(footerText, LEFT, y, { align: 'center', width: CONTENT_W });
    y += doc.heightOfString(footerText, { width: CONTENT_W }) + 8;

    // ── QR code ──
    QRCode.toBuffer(COMPANY_URL, {
      type: 'png',
      width: QR_SIZE * 4,
      margin: 0,
    }).then((qrBuf) => {
      doc.image(qrBuf, (PAGE_W - QR_SIZE) / 2, y, { width: QR_SIZE });
      doc.end();
    }).catch(() => doc.end());
  });
}
