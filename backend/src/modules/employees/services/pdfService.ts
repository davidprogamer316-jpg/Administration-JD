import PDFDocument from 'pdfkit';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { CarJob, ICarJob } from '../../carJobs/models/index.js';
import { Employee } from '../models/index.js';

const FONT = 'Helvetica';
const FONT_B = 'Helvetica-Bold';
const PAGE_W = 612;
const PAGE_H = 792;
const ML = 30;
const MR = 30;
const CW = PAGE_W - ML - MR;

const COL_A = 55;
const COL_B = 75;
const COL_C = 22;
const COL_D = CW - COL_A - COL_B - COL_C - COL_E;
const COL_E = 65;
const CX2 = ML + COL_A;
const CX3 = ML + COL_A + COL_B;
const CX4 = ML + COL_A + COL_B + COL_C;
const CX5 = ML + COL_A + COL_B + COL_C + COL_D;

function fd(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fm(n: number): string {
  return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`;
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

  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: 40, bottom: 40, left: ML, right: MR } });
  doc.on('data', (chunk) => chunks.push(chunk));

  let y = 0;

  function header() {
    doc.fontSize(12).font(FONT_B).fillColor('#000');
    doc.text('Tinting-JD', ML, y, { align: 'center', width: CW });
    doc.fontSize(9).font(FONT);
    doc.text(`Historial de pagos \u2014 ${employee!.name}`, ML, y += 15, { align: 'center', width: CW });
    doc.fontSize(8).fillColor('#555');
    doc.text(`Mes: ${monthName}`, ML, y += 12, { align: 'center', width: CW });
    y += 16;
  }

  function tableHeader() {
    doc.fontSize(7).font(FONT_B).fillColor('#555');
    doc.text('Fecha', ML, y, { width: COL_A });
    doc.text('VIN', CX2, y, { width: COL_B });
    doc.text('Q', CX3, y, { width: COL_C, align: 'center' });
    doc.text('Descripci\u00f3n', CX4, y, { width: COL_D });
    doc.text('Ganancia', CX5, y, { width: COL_E, align: 'right' });
    y += 10;
  }

  function checkPage() {
    if (y > PAGE_H - 50) {
      doc.addPage();
      y = 0;
      header();
      tableHeader();
    }
  }

  header();

  if (periods.length === 0) {
    doc.fontSize(9).font(FONT).fillColor('#000');
    doc.text('No hay periodos registrados para este mes.', ML, y, { align: 'center', width: CW });
  } else {
    tableHeader();

    let totalEarned = 0;
    for (const period of periods) {
      const share = period.employeeDistribution.find((s) => s.employeeId === employeeId);
      if (!share) continue;

      const jobs = await CarJob.find({
        date: { $gte: period.periodStartDate, $lte: period.periodEndDate },
      }).sort({ date: 1 });

      for (const job of jobs) {
        const proportion = period.income > 0 ? (job.payment / period.income) * share.amount : 0;
        const rounded = Math.round(proportion * 100) / 100;

        checkPage();

        doc.fontSize(7).font(FONT).fillColor('#000');
        const dh = doc.heightOfString(job.description, { width: COL_D });
        const rh = Math.max(10, dh + 1);

        doc.text(fd(job.date), ML, y + 1, { width: COL_A });
        doc.text(job.vin, CX2, y + 1, { width: COL_B });
        doc.text(`Q${period.periodNumber}`, CX3, y + 1, { width: COL_C, align: 'center' });
        doc.text(job.description, CX4, y + 1, { width: COL_D });
        doc.text(fm(rounded), CX5, y + 1, { width: COL_E, align: 'right' });
        y += rh;
      }

      totalEarned += share.amount;
    }
  }

  checkPage();

  doc.lineWidth(0.5).strokeColor('#ccc');
  doc.moveTo(ML, y).lineTo(ML + CW, y).stroke();
  y += 5;

  doc.fontSize(9).font(FONT_B).fillColor('#000');
  doc.text('Total ganado en el mes:', ML, y);
  doc.text(fm(totalEarned), CX5, y, { width: COL_E, align: 'right' });
  y += 14;

  doc.fontSize(7).font(FONT).fillColor('#999');
  doc.text('Generado por Tinting-JD', ML, y, { align: 'center', width: CW });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
