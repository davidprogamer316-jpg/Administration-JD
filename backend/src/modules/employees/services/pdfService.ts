import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { CarJob, ICarJob } from '../../carJobs/models/index.js';
import { Employee } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMPANY_NAME = 'Windows Tinting JD';

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
}

function textH(text: string, w: number, fs: number): number {
  const avgCharW = fs * 0.56;
  const cpl = Math.max(1, Math.floor(w / avgCharW));
  const lines = Math.max(1, Math.ceil(text.length / cpl));
  return lines * fs * 1.35;
}

export async function generateEmployeePdf(
  employeeId: string,
  year: number,
  month: number
): Promise<Buffer> {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw Object.assign(new Error('Empleado no encontrado'), { status: 404 });
  }

  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  const periods = await AccountingPeriod.find({
    periodStartDate: { $gte: startOfMonth, $lte: endOfMonth },
  }).sort({ periodStartDate: 1 });

  const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const PAGE_W = 204;
  const MARGIN = 12;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const LEFT = MARGIN;
  const RIGHT = PAGE_W - MARGIN;

  // Column split
  const PRICE_W = 65;
  const DESC_W = CONTENT_W - PRICE_W;
  const PRICE_X = LEFT + DESC_W;

  // Pre-fetch jobs per period
  const jobsByPeriod: Record<string, ICarJob[]> = {};
  for (const period of periods) {
    const share = period.employeeDistribution.find((s) => s.employeeId === employeeId);
    if (!share) continue;
    const jobs = await CarJob.find({
      date: { $gte: period.periodStartDate, $lte: period.periodEndDate },
    }).sort({ date: 1 });
    jobsByPeriod[period._id.toString()] = jobs;
  }

  // Estimate page height
  let pageH = MARGIN;
  pageH += 5;
  // Company name
  pageH += 16;
  // Subtitle
  pageH += textH(`Historial de pagos — ${employee.name}`, CONTENT_W, 11) + 4;
  // Month
  pageH += textH(`Mes: ${monthName}`, CONTENT_W, 10) + 4;
  // Divider
  pageH += 8;

  if (periods.length === 0) {
    pageH += 20;
  } else {
    for (const period of periods) {
      const share = period.employeeDistribution.find((s) => s.employeeId === employeeId);
      if (!share) continue;

      const label = `Q${period.periodNumber}: ${formatDate(period.periodStartDate)} - ${formatDate(period.periodEndDate)}`;
      pageH += textH(label, CONTENT_W, 11) + 6;
      // Table header
      pageH += 14;
      // Job rows
      const jobs = jobsByPeriod[period._id.toString()] || [];
      for (const job of jobs) {
        pageH += textH(formatDate(job.date), DESC_W, 10) + 4;
      }
      // Period total
      pageH += 16;
      // Divider
      pageH += 8;
    }
  }

  // Grand total
  pageH += 18;
  // Footer
  pageH += 14;

  pageH = Math.ceil(pageH * 1.2) + MARGIN;

  const doc = new PDFDocument({ size: [PAGE_W, pageH], margin: MARGIN });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  // Register Courier Prime
  const FONT_DIR = path.join(__dirname, '../../../../assets/fonts');
  const CP_REG = path.join(FONT_DIR, 'CourierPrime.ttf');
  const CP_BOLD = path.join(FONT_DIR, 'CourierPrime-Bold.ttf');
  if (fs.existsSync(CP_REG)) {
    doc.registerFont('CourierPrime', CP_REG);
    doc.registerFont('CourierPrime-Bold', CP_BOLD);
  }
  const FONT = fs.existsSync(CP_REG) ? 'CourierPrime' : 'Courier';

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = 5;

    // ── Header ──
    doc.fontSize(18).font(FONT).fillColor('#000');
    doc.text(COMPANY_NAME, LEFT, y, { align: 'center', width: CONTENT_W });
    y += 16;

    doc.fontSize(11).font(FONT).fillColor('#000');
    doc.text(`Historial de pagos — ${employee.name}`, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(`Historial de pagos — ${employee.name}`, CONTENT_W, 11) + 2;

    doc.fontSize(10).font(FONT).fillColor('#000');
    doc.text(`Mes: ${monthName}`, LEFT, y, { align: 'center', width: CONTENT_W });
    y += textH(`Mes: ${monthName}`, CONTENT_W, 10) + 2;

    // ── Divider ──
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor('#000').lineWidth(0.5).stroke();
    y += 6;

    if (periods.length === 0) {
      doc.fontSize(10).font(FONT).fillColor('#000');
      doc.text('No hay periodos registrados.', LEFT, y, { align: 'center', width: CONTENT_W });
    } else {
      for (const period of periods) {
        const share = period.employeeDistribution.find((s) => s.employeeId === employeeId);
        if (!share) continue;

        const label = `Q${period.periodNumber}: ${formatDate(period.periodStartDate)} - ${formatDate(period.periodEndDate)}`;
        const jobs = jobsByPeriod[period._id.toString()] || [];

        // ── Period header ──
        doc.fontSize(11).font(FONT).fillColor('#000');
        doc.text(label, LEFT, y, { align: 'center', width: CONTENT_W });
        y += textH(label, CONTENT_W, 11) + 4;

        // ── Column headers ──
        doc.fontSize(10).font(FONT).fillColor('#000');
        doc.text('FECHA', LEFT, y, { width: DESC_W });
        doc.text('GANANCIA', PRICE_X, y, { width: PRICE_W, align: 'right' });
        y += 12;

        // ── Job rows ──
        for (const job of jobs) {
          const proportion = period.income > 0 ? (job.payment / period.income) * share.amount : 0;
          const rounded = Math.round(proportion * 100) / 100;

          doc.fontSize(10).font(FONT).fillColor('#000');
          const dateStr = formatDate(job.date);
          const rowH = Math.max(14, doc.heightOfString(dateStr, { width: DESC_W }) + 2);

          doc.text(dateStr, LEFT, y + 1, { width: DESC_W });
          doc.text(formatMoney(rounded), PRICE_X, y + 1, { width: PRICE_W, align: 'right' });
          y += rowH;
        }

        // ── Period total ──
        doc.lineWidth(0.5).strokeColor('#000');
        doc.moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
        y += 4;

        doc.fontSize(11).font(FONT).fillColor('#000');
        doc.text('TOTAL PERIODO', LEFT, y, { width: DESC_W });
        doc.text(formatMoney(share.amount), PRICE_X, y, { width: PRICE_W, align: 'right' });
        y += 14;

        // ── Divider ──
        doc.lineWidth(0.5).strokeColor('#000');
        doc.moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
        y += 6;
      }
    }

    // ── Grand total ──
    const totalEarned = periods.reduce((sum, p) => {
      const share = p.employeeDistribution.find((s) => s.employeeId === employeeId);
      return sum + (share?.amount || 0);
    }, 0);

    doc.fontSize(13).font(FONT).fillColor('#000');
    doc.text(`TOTAL: ${formatMoney(totalEarned)}`, LEFT, y, { align: 'center', width: CONTENT_W });
    y += 16;

    // ── Footer ──
    doc.fontSize(9).font(FONT).fillColor('#000');
    doc.text('Generado por Tinting-JD', LEFT, y, { align: 'center', width: CONTENT_W });

    doc.end();
  });
}
