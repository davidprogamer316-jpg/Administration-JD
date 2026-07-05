import PDFDocument from 'pdfkit';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { CarJob, ICarJob } from '../../carJobs/models/index.js';
import { Employee } from '../models/index.js';

const ML = 50;
const MR = 50;
const CW = 612 - ML - MR;
const COL_W = 80;
const COL_X = ML + CW - COL_W;

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
  const doc = new PDFDocument({ size: 'LETTER', margins: { top: ML, bottom: 50, left: ML, right: MR } });
  doc.on('data', (chunk) => chunks.push(chunk));

  const jobsByPeriod: Record<string, ICarJob[]> = {};
  for (const period of periods) {
    const share = period.employeeDistribution.find((s) => s.employeeId === employeeId);
    if (!share) continue;
    const jobs = await CarJob.find({
      date: { $gte: period.periodStartDate, $lte: period.periodEndDate },
    }).sort({ date: 1 });
    jobsByPeriod[period._id.toString()] = jobs;
  }

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const emitRow = (date: string, amount: string) => {
      doc.fontSize(10).font('Helvetica').fillColor('#000');
      doc.text(date, ML, doc.y, { width: CW - COL_W });
      doc.text(amount, COL_X, doc.y - doc.currentLineHeight(), { width: COL_W, align: 'right' });
      doc.moveDown(0.1);
    };

    // ── Header ──
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000');
    doc.text('Tinting-JD', { align: 'center' });
    doc.moveDown(0.3);

    doc.fontSize(14).font('Helvetica');
    doc.text(`Historial de pagos — ${employee.name}`, { align: 'center' });
    doc.moveDown(0.2);

    doc.fontSize(11).fillColor('#555');
    doc.text(`Mes: ${monthName}`, { align: 'center' });
    doc.moveDown(0.8);

    if (periods.length === 0) {
      doc.fontSize(11).fillColor('#000').text('No hay periodos registrados para este mes.', { align: 'center' });
    } else {
      for (const period of periods) {
        const share = period.employeeDistribution.find((s) => s.employeeId === employeeId);
        if (!share) continue;

        const label = `Q${period.periodNumber}: ${fd(period.periodStartDate)} — ${fd(period.periodEndDate)}`;
        const jobs = jobsByPeriod[period._id.toString()] || [];

        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        // ── Period header ──
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1B1B2F');
        doc.text(label, ML, doc.y, { width: CW });
        doc.moveDown(0.3);

        // ── Column headers ──
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#888');
        doc.text('Fecha', ML, doc.y, { width: CW - COL_W });
        doc.text('Ganancia', COL_X, doc.y - doc.currentLineHeight(), { width: COL_W, align: 'right' });
        doc.moveDown(0.1);

        doc.lineWidth(0.5).strokeColor('#ccc');
        doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).stroke();
        doc.moveDown(0.3);

        // ── Job rows ──
        for (const job of jobs) {
          if (doc.y > 730) {
            doc.addPage();
          }

          const proportion = period.income > 0 ? (job.payment / period.income) * share.amount : 0;
          const rounded = Math.round(proportion * 100) / 100;
          emitRow(fd(job.date), fm(rounded));
        }

        // ── Period total ──
        if (doc.y > 730) {
          doc.addPage();
        }

        doc.lineWidth(0.5).strokeColor('#ccc');
        doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).stroke();
        doc.moveDown(0.2);

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#5B8C6B');
        doc.text('Total periodo', ML, doc.y, { width: CW - COL_W });
        doc.text(fm(share.amount), COL_X, doc.y - doc.currentLineHeight(), { width: COL_W, align: 'right' });
        doc.moveDown(0.1);

        // ── Separator ──
        doc.lineWidth(0.5).strokeColor('#999');
        doc.moveTo(ML, doc.y).lineTo(ML + CW, doc.y).stroke();
        doc.moveDown(0.5);
      }
    }

    // ── Grand total ──
    if (doc.y > 730) {
      doc.addPage();
    }

    const totalEarned = periods.reduce((sum, p) => {
      const share = p.employeeDistribution.find((s) => s.employeeId === employeeId);
      return sum + (share?.amount || 0);
    }, 0);

    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1B1B2F');
    doc.text(`Total ganado en el mes: ${fm(totalEarned)}`, ML, doc.y, { width: CW, align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(8).fillColor('#8B7D8B');
    doc.text('Generado por Tinting-JD', { align: 'center' });

    doc.end();
  });
}
