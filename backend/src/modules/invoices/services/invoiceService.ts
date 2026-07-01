import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Invoice } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANY_NAME = 'Windows Tinting JD';
const COMPANY_NIT = 'NIT 123.456.789-0';
const COMPANY_PHONE = '300 123 4567';
const COMPANY_ADDRESS = 'Cra 1 # 2-3, Ciudad';

const LOGO_PATH = path.join(__dirname, '../../../../assets/logo.png');

function formatMoney(n: number): string {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
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
  items: Array<{ description: string; amount: number; carJobId?: string }>;
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
  // Company header   (13 + 3 gaps + 9×3 + 3 gaps)
  pageH += 18 + 2 + textH(COMPANY_NIT, CONTENT_W, 9) + 2 +
    textH(COMPANY_ADDRESS, CONTENT_W, 9) + 2 + textH(`Tel: ${COMPANY_PHONE}`, CONTENT_W, 9);
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
    pageH += Math.max(18, textH(item.description, DESC_W, 10) + 4);
  }
  // Total
  pageH += 4 + 28;
  // Separator
  pageH += 14;
  // Warranty
  pageH += textH(
    'This document certifies the completion of the safety film ' +
    'installation (polarized/tinting) service for the described vehicle. ' +
    'Warranty applies to materials and workmanship per agreed terms.',
    CONTENT_W, 8
  ) + 4;
  // Footer
  pageH += textH(
    `Generated on ${formatDate(new Date())} by ${COMPANY_NAME}.`,
    CONTENT_W, 8
  );
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

    doc.fontSize(9).font('Helvetica').fillColor('#444');
    doc.text(COMPANY_NIT, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(COMPANY_NIT, CONTENT_W, 9) + 2;

    doc.text(COMPANY_ADDRESS, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(COMPANY_ADDRESS, CONTENT_W, 9) + 2;

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
      const rowH = Math.max(18, descH + 4);

      doc.text(item.description, LEFT, y + 2, { width: DESC_W });
      doc.text(formatMoney(item.amount), PRICE_X, y + 2, { width: PRICE_W, align: 'right' });

      y += rowH;
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
      'This document certifies the completion of the safety film ' +
      'installation (polarized/tinting) service for the described vehicle. ' +
      'Warranty applies to materials and workmanship per agreed terms.';
    doc.text(warrantyText, LEFT, y, { width: CONTENT_W, align: 'center' });
    y += doc.heightOfString(warrantyText, { width: CONTENT_W }) + 4;

    // ── Footer ──
    doc.fontSize(7).font('Helvetica').fillColor('#999');
    const footerText = `Generated on ${formatDate(new Date())} by ${COMPANY_NAME}.`;
    doc.text(footerText, LEFT, y, { align: 'center', width: CONTENT_W });

    doc.end();
  });
}
