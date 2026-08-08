import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { Quote } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANY_NAME = 'WINDOWS TINTING JD CORP';
const COMPANY_TAGLINE = 'Mobile tinting service — we come to you';
const COMPANY_PHONE = '786 793 4440';

const LOGO_PATH = path.join(__dirname, '../../../../assets/logo.PNG');

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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function list() {
  return Quote.find().sort({ date: -1 });
}

export async function getById(id: string) {
  const quote = await Quote.findById(id);
  if (!quote) {
    throw Object.assign(new Error('Cotización no encontrada'), { status: 404 });
  }
  return quote;
}

export async function create(data: {
  clientName: string;
  items: Array<{ ancho: number; alto: number; unidades: number; nota?: string }>;
  waste?: number;
  pricePerSqFt: number;
}) {
  const count = await Quote.countDocuments();
  const quoteNumber = `COT-${String(count + 1).padStart(4, '0')}`;

  const waste = data.waste !== undefined ? data.waste : 0.1;

  const items = data.items.map((item) => {
    const sqFt = round2((item.ancho * item.alto * item.unidades) / 144);
    return {
      ancho: item.ancho,
      alto: item.alto,
      unidades: item.unidades,
      nota: item.nota || '',
      sqFt,
    };
  });

  const totalSqFt = round2(items.reduce((sum, it) => sum + it.sqFt, 0));
  const sqFtWithWaste = round2(totalSqFt * (1 + waste));
  const total = round2(data.pricePerSqFt * sqFtWithWaste);

  const quote = await Quote.create({
    quoteNumber,
    clientName: data.clientName,
    items,
    waste,
    totalSqFt,
    sqFtWithWaste,
    pricePerSqFt: data.pricePerSqFt,
    total,
  });

  return quote;
}

export async function remove(id: string) {
  const quote = await Quote.findByIdAndDelete(id);
  if (!quote) {
    throw Object.assign(new Error('Cotización no encontrada'), { status: 404 });
  }
  return { message: 'Cotización eliminada' };
}

export async function generatePdf(id: string): Promise<Buffer> {
  const quote = await Quote.findById(id);
  if (!quote) {
    throw Object.assign(new Error('Cotización no encontrada'), { status: 404 });
  }

  // ── Layout constants for half-letter landscape (8.5" x 5.5") like an invoice pad ──
  const PAGE_W = 612;
  const PAGE_H = 396;
  const MARGIN = 24;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const LEFT = MARGIN;
  const RIGHT = PAGE_W - MARGIN;
  const FONT_COLOR = '#1a1a2e';
  const ACCENT = '#1a1a2e';

  // ── Pre-process logo (color) ──
  let logoBuffer: Buffer | null = null;
  const LOGO_DISPLAY_W = 76;
  let logoH = 0;
  if (fs.existsSync(LOGO_PATH)) {
    const imgBuf = fs.readFileSync(LOGO_PATH);
    const meta = await sharp(imgBuf).metadata();
    logoH = Math.round(LOGO_DISPLAY_W * meta.height! / meta.width!);
    logoBuffer = imgBuf;
  }

  const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // ── Register Courier Prime (bundled TTF) ──
  const FONT_DIR = path.join(__dirname, '../../../../assets/fonts');
  const CP_REG = path.join(FONT_DIR, 'CourierPrime.ttf');
  const CP_BOLD = path.join(FONT_DIR, 'CourierPrime-Bold.ttf');
  if (fs.existsSync(CP_REG)) {
    doc.registerFont('CourierPrime', CP_REG);
    doc.registerFont('CourierPrime-Bold', CP_BOLD);
  }
  const FONT = fs.existsSync(CP_REG) ? 'CourierPrime' : 'Courier';
  const FONT_BOLD = fs.existsSync(CP_REG) ? 'CourierPrime-Bold' : 'Courier';

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Invoice-pad border frame ──
    doc.rect(8, 8, PAGE_W - 16, PAGE_H - 16).lineWidth(1.5).strokeColor(ACCENT).stroke();

    let y = 20;

    // ── Header: logo (color, left) + company (middle) + doc info (right) ──
    if (logoBuffer) {
      doc.image(logoBuffer, LEFT, y, { width: LOGO_DISPLAY_W });
    }

    const HEADER_TEXT_X = LEFT + LOGO_DISPLAY_W + 14;
    const HEADER_TEXT_W = CONTENT_W - LOGO_DISPLAY_W - 14 - 190;

    doc.font(FONT_BOLD).fontSize(17).fillColor(FONT_COLOR);
    doc.text(COMPANY_NAME, HEADER_TEXT_X, y + 4, { width: HEADER_TEXT_W });

    doc.font(FONT).fontSize(9).fillColor('#555');
    doc.text(COMPANY_TAGLINE, HEADER_TEXT_X, y + 27, { width: HEADER_TEXT_W });

    doc.font(FONT).fontSize(9).fillColor('#555');
    doc.text(`Tel: ${COMPANY_PHONE}`, HEADER_TEXT_X, y + 41, { width: HEADER_TEXT_W });

    doc.font(FONT_BOLD).fontSize(15).fillColor(FONT_COLOR);
    doc.text('QUOTATION', RIGHT - 190, y, { width: 190, align: 'right' });
    doc.text(quote.quoteNumber, RIGHT - 190, y + 18, { width: 190, align: 'right' });
    doc.font(FONT).fontSize(9).fillColor('#333');
    doc.text(`Date: ${formatDate(quote.date)}`, RIGHT - 190, y + 40, { width: 190, align: 'right' });

    y += Math.max(logoH, 56) + 10;

    // ── Double divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor(ACCENT).stroke();
    y += 2;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor(ACCENT).stroke();
    y += 8;

    // ── Customer ──
    doc.font(FONT_BOLD).fontSize(9).fillColor('#777');
    doc.text('CUSTOMER', LEFT, y);
    y += 12;
    doc.font(FONT_BOLD).fontSize(13).fillColor(FONT_COLOR);
    doc.text(quote.clientName, LEFT, y, { width: CONTENT_W });
    y += doc.heightOfString(quote.clientName, { width: CONTENT_W }) + 4;

    // ── Table header ──
    const SQFT_W = 70;
    const NO_W = 26;
    const MEASURE_W = 190;
    const NOTES_W = CONTENT_W - NO_W - MEASURE_W - SQFT_W;
    const MEASURE_LEFT = LEFT + NO_W;
    const NOTES_LEFT = MEASURE_LEFT + MEASURE_W;
    const SQFT_LEFT = RIGHT - SQFT_W;

    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor(ACCENT).stroke();
    y += 4;
    doc.font(FONT_BOLD).fontSize(10).fillColor(FONT_COLOR);
    doc.text('No.', LEFT, y, { width: NO_W });
    doc.text('MEASUREMENTS', MEASURE_LEFT, y, { width: MEASURE_W, align: 'center' });
    doc.text('NOTES', NOTES_LEFT, y, { width: NOTES_W });
    doc.text('SQ FT', SQFT_LEFT, y, { width: SQFT_W, align: 'right' });
    y += 15;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor(ACCENT).stroke();
    y += 4;

    // ── Items ──
    quote.items.forEach((item, i) => {
      const measureText = `${item.ancho}" x ${item.alto}" x ${item.unidades} u`;
      const noteText = item.nota || '';
      const rowH = Math.max(
        doc.heightOfString(measureText, { width: MEASURE_W }),
        noteText ? doc.heightOfString(noteText, { width: NOTES_W }) : 0,
        13
      );

      doc.font(FONT).fontSize(10).fillColor(FONT_COLOR);
      doc.text(String(i + 1), LEFT, y, { width: NO_W });
      doc.text(measureText, MEASURE_LEFT, y, { width: MEASURE_W, align: 'center' });
      doc.text(noteText, NOTES_LEFT, y, { width: NOTES_W });
      doc.text(`${item.sqFt}`, SQFT_LEFT, y, { width: SQFT_W, align: 'right' });
      y += rowH + 3;
    });

    // ── Divider ──
    y += 2;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1).strokeColor(ACCENT).stroke();
    y += 8;

    // ── Summary ──
    const wasteSqFt = round2(quote.sqFtWithWaste - quote.totalSqFt);
    const summaryRows = [
      { label: 'Total sq ft', value: `${quote.totalSqFt}` },
      { label: `Waste (${Math.round(quote.waste * 100)}%)`, value: `${wasteSqFt}` },
      { label: 'Sq ft with waste', value: `${quote.sqFtWithWaste}` },
      { label: 'Price / sq ft', value: formatMoney(quote.pricePerSqFt) },
    ];

    doc.font(FONT).fontSize(10).fillColor('#333');
    for (const row of summaryRows) {
      doc.text(row.label, LEFT, y, { width: CONTENT_W / 2 });
      doc.text(row.value, LEFT + CONTENT_W / 2, y, { width: CONTENT_W / 2, align: 'right' });
      y += 15;
    }

    // ── Total ──
    y += 2;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(1.5).strokeColor(ACCENT).stroke();
    y += 10;
    doc.font(FONT_BOLD).fontSize(15).fillColor(FONT_COLOR);
    doc.text('TOTAL', LEFT, y);
    doc.text(formatMoney(quote.total), LEFT + CONTENT_W / 2, y, { width: CONTENT_W / 2, align: 'right' });
    y += 22;

    // ── Divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).lineWidth(0.5).strokeColor(ACCENT).stroke();
    y += 6;

    // ── Footer ──
    doc.font(FONT).fontSize(8).fillColor('#555');
    const disclaimer =
      'This is a quotation. Final pricing is subject to verification at time of installation.';
    doc.text(disclaimer, LEFT, y, { width: CONTENT_W, align: 'center' });
    y += doc.heightOfString(disclaimer, { width: CONTENT_W }) + 2;

    doc.font(FONT).fontSize(8).fillColor('#555');
    const footerText = `Generated on ${formatDate(new Date())} by ${COMPANY_NAME}.`;
    doc.text(footerText, LEFT, y, { width: CONTENT_W, align: 'center' });

    doc.end();
  });
}
