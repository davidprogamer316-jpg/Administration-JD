import PDFDocument from 'pdfkit';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { CarJob, ICarJob } from '../../carJobs/models/index.js';
import { Employee } from '../models/index.js';

const FONT = 'Helvetica';
const FONT_B = 'Helvetica-Bold';
const PAGE_W = 612;
const PAGE_H = 792;
const ML = 40;
const MR = 40;
const CW = PAGE_W - ML - MR;

const COL_A = 70;
const COL_B = 85;
const COL_D = 75;
const COL_C = CW - COL_A - COL_B - COL_D;
const CX2 = ML + COL_A;
const CX3 = ML + COL_A + COL_B;
const CX4 = ML + COL_A + COL_B + COL_C;

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
    doc.fontSize(16).font(FONT_B).fillColor('#000');
    doc.text('Tinting-JD', ML, y += 0, { align: 'center', width: CW });
    doc.fontSize(12).font(FONT);
    doc.text(`Historial de pagos — ${employee!.name}`, ML, y += 22, { align: 'center', width: CW });
    doc.fontSize(10).fillColor('#555');
    doc.text(`Mes: ${monthName}`, ML, y += 18, { align: 'center', width: CW });
    y += 26;
  }

  function tableHeader() {
    doc.fontSize(8).font(FONT_B).fillColor('#555');
    doc.text('Fecha', ML, y, { width: COL_A });
    doc.text('VIN', CX2, y, { width: COL_B });
    doc.text('Descripci\u00f3n', CX3, y, { width: COL_C });
    doc.text('Ganancia', CX4, y, { width: COL_D, align: 'right' });
    y += 14;
  }

  function checkPage() {
    if (y > PAGE_H - 60) {
      doc.addPage();
      y = 0;
      header();
      tableHeader();
    }
  }

  header();

  if (periods.length === 0) {
    doc.fontSize(11).font(FONT).fillColor('#000');
    doc.text('No hay periodos registrados para este mes.', ML, y, { align: 'center', width: CW });
  } else {
    for (const period of periods) {
      const share = period.employeeDistribution.find((s) => s.employeeId === employeeId);
      if (!share) continue;

      const jobs = await CarJob.find({
        date: { $gte: period.periodStartDate, $lte: period.periodEndDate },
      }).sort({ date: 1 });

      checkPage();

      const label = `Q${period.periodNumber}: ${fd(period.periodStartDate)} \u2014 ${fd(period.periodEndDate)}`;
      doc.fontSize(11).font(FONT_B).fillColor('#000');
      doc.text(label, ML, y);
      y += 16;

      checkPage();
      tableHeader();

      let totalPeriod = 0;
      for (const job of jobs) {
        const proportion = period.income > 0 ? (job.payment / period.income) * share.amount : 0;
        const rounded = Math.round(proportion * 100) / 100;
        totalPeriod += rounded;

        checkPage();

        doc.fontSize(9).font(FONT).fillColor('#000');
        const dh = doc.heightOfString(job.description, { width: COL_C });
        const rh = Math.max(15, dh + 2);

        doc.text(fd(job.date), ML, y + 2, { width: COL_A });
        doc.text(job.vin, CX2, y + 2, { width: COL_B });
        doc.text(job.description, CX3, y + 2, { width: COL_C });
        doc.text(fm(rounded), CX4, y + 2, { width: COL_D, align: 'right' });
        y += rh;
      }

      checkPage();

      doc.lineWidth(0.5).strokeColor('#ccc');
      doc.moveTo(ML, y).lineTo(ML + CW, y).stroke();
      y += 6;

      checkPage();

      doc.fontSize(10).font(FONT_B).fillColor('#000');
      doc.text('Total periodo', ML, y);
      doc.text(fm(Math.round(totalPeriod * 100) / 100), CX4, y, { width: COL_D, align: 'right' });
      y += 18;

      checkPage();

      doc.lineWidth(0.5).strokeColor('#999');
      doc.moveTo(ML, y).lineTo(ML + CW, y).stroke();
      y += 12;
    }
  }

  const totalEarned = periods.reduce((sum, p) => {
    const share = p.employeeDistribution.find((s) => s.employeeId === employeeId);
    return sum + (share?.amount || 0);
  }, 0);

  checkPage();

  doc.fontSize(13).font(FONT_B).fillColor('#000');
  doc.text(`Total ganado en el mes: ${fm(totalEarned)}`, ML, y, { align: 'center', width: CW });
  y += 24;

  doc.fontSize(8).font(FONT).fillColor('#999');
  doc.text('Generado por Tinting-JD', ML, y, { align: 'center', width: CW });

  doc.end();

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
