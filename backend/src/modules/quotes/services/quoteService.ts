import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { Quote } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANY_NAME = 'WINDOWS TINTING JD CORP';
const COMPANY_TAGLINE = 'Mobile tinting service — we come to you';
const COMPANY_PHONE = '786 793 4440';
const COMPANY_URL = 'https://tinting-film.com';

const LOGO_PATH = path.join(__dirname, '../../../../assets/logo.PNG');
const QR_SIZE = 72;

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

  // ── Layout constants for 80 mm thermal paper (same as invoice) ──
  const PAGE_W = 204;
  const MARGIN = 4;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const LEFT = MARGIN;
  const RIGHT = PAGE_W - MARGIN;

  function textH(text: string, w: number, fs: number): number {
    const avgCharW = fs * 0.56;
    const cpl = Math.max(1, Math.floor(w / avgCharW));
    const lines = Math.max(1, Math.ceil(text.length / cpl));
    return lines * fs * 1.35;
  }

  // ── Pre-process logo ──
  let logoBuffer: Buffer | null = null;
  const LOGO_DISPLAY_W = 160;
  let logoH = 0;
  if (fs.existsSync(LOGO_PATH)) {
    const imgBuf = fs.readFileSync(LOGO_PATH);
    const meta = await sharp(imgBuf).metadata();
    logoH = Math.round(LOGO_DISPLAY_W * meta.height! / meta.width!);
    logoBuffer = await sharp(imgBuf).grayscale().toBuffer();
  }

  // ── Estimate page height ──
  const summaryLines = [
    'Total sq ft',
    `Waste (${Math.round(quote.waste * 100)}%)`,
    'Sq ft with waste',
    'Price / sq ft',
    'TOTAL',
  ];
  let pageH = MARGIN;
  pageH += 5;
  pageH += logoH || 0;
  pageH += 5;
  pageH += textH(COMPANY_NAME, CONTENT_W, 18) + textH(COMPANY_TAGLINE, CONTENT_W, 10) + textH(`Tel: ${COMPANY_PHONE}`, CONTENT_W, 10);
  pageH += 4;
  pageH += 14 + 4 + 14 + 4 + textH(`Date: ${formatDate(quote.date)}`, CONTENT_W, 10);
  pageH += 12;
  pageH += 12 + 2 + textH(quote.clientName, CONTENT_W, 11) + 2;
  pageH += 12;
  pageH += 16;
  for (const item of quote.items) {
    let itemH = textH(`${item.ancho}" x ${item.alto}" x ${item.unidades} = ${item.sqFt} sq ft`, CONTENT_W, 11) + 4;
    if (item.nota) {
      itemH += textH(`Note: ${item.nota}`, CONTENT_W, 9) + 2;
    }
    pageH += itemH;
  }
  pageH += 4 + summaryLines.length * 16 + 8;
  pageH += 12;
  pageH += textH(
    'This is a quotation. Final pricing is subject to verification at time of installation.',
    CONTENT_W, 10
  ) + 4;
  pageH += textH(`Generated on ${formatDate(new Date())} by ${COMPANY_NAME}.`, CONTENT_W, 10);
  pageH += 12 + QR_SIZE + 8;
  pageH = Math.ceil(pageH * 1.4) + MARGIN;

  const doc = new PDFDocument({ size: [PAGE_W, pageH], margin: MARGIN });
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

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = 5;

    // ── Logo (grayscale) ──
    if (logoBuffer) {
      doc.image(logoBuffer, (PAGE_W - LOGO_DISPLAY_W) / 2, y, { width: LOGO_DISPLAY_W });
      y += logoH;
    }

    y += 5;

    // ── Company header (centred) ──
    doc.fontSize(18).font(FONT).fillColor('#000');
    doc.text(COMPANY_NAME, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(COMPANY_NAME, CONTENT_W, 18);

    doc.fontSize(10).font(FONT).fillColor('#000');
    doc.text(COMPANY_TAGLINE, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(COMPANY_TAGLINE, CONTENT_W, 10);

    doc.fontSize(10).font(FONT).fillColor('#000');
    doc.text(`Tel: ${COMPANY_PHONE}`, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(`Tel: ${COMPANY_PHONE}`, CONTENT_W, 10);

    // ── Thin divider ──
    y += 1;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#000').lineWidth(0.5).stroke();
    y += 3;

    // ── Quote title + number + date ──
    doc.fontSize(16).font(FONT).fillColor('#000');
    doc.text('QUOTATION', LEFT, y, { align: 'center', width: CONTENT_W });
    y += 14;

    doc.fontSize(16).font(FONT).fillColor('#000');
    doc.text(quote.quoteNumber, LEFT, y, { align: 'center', width: CONTENT_W });
    y += 14;

    doc.fontSize(10).font(FONT).fillColor('#000');
    doc.text(`Date: ${formatDate(quote.date)}`, LEFT, y, { align: 'center', width: CONTENT_W });
    y += 10;

    // ── Divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#000').lineWidth(0.5).stroke();
    y += 8;

    // ── Client ──
    doc.fontSize(11).font(FONT).fillColor('#000');
    doc.text('CUSTOMER', LEFT, y);
    y += 12;

    doc.fontSize(11).font(FONT).fillColor('#000');
    doc.text(quote.clientName, LEFT, y);
    y += textH(quote.clientName, CONTENT_W, 11) + 2;

    // ── Divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#000').lineWidth(0.5).stroke();
    y += 8;

    // ── Table header ──
    doc.fontSize(11).font(FONT).fillColor('#000');
    doc.text('MEASUREMENTS', LEFT, y, { width: CONTENT_W });
    y += 14;

    // ── Items ──
    for (const item of quote.items) {
      const measureText = `${item.ancho}" x ${item.alto}" x ${item.unidades} u = ${item.sqFt} sq ft`;
      doc.fontSize(11).font(FONT).fillColor('#000');
      doc.text(measureText, LEFT, y, { width: CONTENT_W });
      y += doc.heightOfString(measureText, { width: CONTENT_W }) + 2;

      if (item.nota) {
        doc.fontSize(9).font(FONT).fillColor('#000');
        const noteText = `Note: ${item.nota}`;
        doc.text(noteText, LEFT, y, { width: CONTENT_W });
        y += doc.heightOfString(noteText, { width: CONTENT_W }) + 2;
      }
    }

    // ── Summary / total ──
    y += 2;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#000').lineWidth(1).stroke();
    y += 8;

    const summaryRows = [
      { label: 'Total sq ft', value: `${quote.totalSqFt}` },
      { label: `Waste (${Math.round(quote.waste * 100)}%)`, value: `${quote.sqFtWithWaste - quote.totalSqFt}` },
      { label: 'Sq ft with waste', value: `${quote.sqFtWithWaste}` },
      { label: 'Price / sq ft', value: formatMoney(quote.pricePerSqFt) },
    ];

    doc.fontSize(10).font(FONT).fillColor('#000');
    for (const row of summaryRows) {
      doc.text(row.label, LEFT, y, { width: CONTENT_W / 2 });
      doc.text(row.value, LEFT + CONTENT_W / 2, y, { width: CONTENT_W / 2, align: 'right' });
      y += 14;
    }

    y += 2;
    doc.fontSize(14).font(FONT).fillColor('#000');
    doc.text('TOTAL', LEFT, y);
    doc.text(formatMoney(quote.total), LEFT + CONTENT_W / 2, y, { width: CONTENT_W / 2, align: 'right' });
    y += 20;

    // ── Divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#000').lineWidth(0.5).stroke();
    y += 8;

    // ── Disclaimers ──
    doc.fontSize(10).font(FONT).fillColor('#000');
    const disclaimer =
      'This is a quotation. Final pricing is subject to verification at time of installation.';
    doc.text(disclaimer, LEFT, y, { width: CONTENT_W, align: 'center' });
    y += doc.heightOfString(disclaimer, { width: CONTENT_W }) + 4;

    doc.fontSize(10).font(FONT).fillColor('#000');
    const footerText = `Generated on ${formatDate(new Date())} by ${COMPANY_NAME}.`;
    doc.text(footerText, LEFT, y, { align: 'center', width: CONTENT_W });
    y += doc.heightOfString(footerText, { width: CONTENT_W }) + 8;

    // ── QR code ──
    y += 12;
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
