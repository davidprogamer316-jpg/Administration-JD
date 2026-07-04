import PDFDocument from 'pdfkit';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { CarJob, ICarJob } from '../../carJobs/models/index.js';
import { Employee } from '../models/index.js';

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMoney(n: number): string {
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

  const MARGIN_L = 40;
  const MARGIN_R = 40;
  const PAGE_W = 612;
  const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

  const COL_DATE = 70;
  const COL_VIN = 90;
  const COL_EARN = 80;
  const COL_DESC = CONTENT_W - COL_DATE - COL_VIN - COL_EARN;
  const COL_RIGHT = MARGIN_L + COL_DATE + COL_VIN + COL_DESC;

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 40, bottom: 40, left: MARGIN_L, right: MARGIN_R },
  });

  const jobsByPeriod: Record<string, ICarJob[]> = {};
  for (const period of periods) {
    const share = period.employeeDistribution.find(
      (s) => s.employeeId === employeeId
    );
    if (!share) continue;

    const jobs = await CarJob.find({
      date: {
        $gte: period.periodStartDate,
        $lte: period.periodEndDate,
      },
    }).sort({ date: 1 });

    jobsByPeriod[period._id.toString()] = jobs;
  }

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });

    let y = 40;

    // ── Header ──
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#000');
    doc.text('Tinting-JD', MARGIN_L, y, { align: 'center', width: CONTENT_W });
    y += 22;

    doc.fontSize(12).font('Helvetica').fillColor('#000');
    doc.text(`Historial de pagos — ${employee.name}`, MARGIN_L, y, { align: 'center', width: CONTENT_W });
    y += 18;

    doc.fontSize(10).fillColor('#555');
    doc.text(`Mes: ${monthName}`, MARGIN_L, y, { align: 'center', width: CONTENT_W });
    y += 24;

    if (periods.length === 0) {
      doc.fontSize(11).fillColor('#000').text('No hay periodos registrados para este mes.', MARGIN_L, y, { align: 'center', width: CONTENT_W });
    } else {
      for (const period of periods) {
        const share = period.employeeDistribution.find(
          (s) => s.employeeId === employeeId
        );
        if (!share) continue;

        const label = `Q${period.periodNumber}: ${formatDate(period.periodStartDate)} — ${formatDate(period.periodEndDate)}`;
        const jobs = jobsByPeriod[period._id.toString()] || [];

        // ── Period section header ──
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000');
        doc.text(label, MARGIN_L, y);
        y += 18;

        // ── Table header row ──
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#555');
        doc.text('Fecha', MARGIN_L, y, { width: COL_DATE });
        doc.text('VIN', MARGIN_L + COL_DATE, y, { width: COL_VIN });
        doc.text('Descripción', MARGIN_L + COL_DATE + COL_VIN, y, { width: COL_DESC });
        doc.text('Ganancia', COL_RIGHT, y, { width: COL_EARN, align: 'right' });
        y += 16;

        // ── Table rows ──
        let totalPeriod = 0;
        for (const job of jobs) {
          const proportion =
            period.income > 0
              ? (job.payment / period.income) * share.amount
              : 0;
          const rounded = Math.round(proportion * 100) / 100;
          totalPeriod += rounded;

          doc.fontSize(9).font('Helvetica').fillColor('#000');
          const dateStr = formatDate(job.date);
          const descLines = doc.heightOfString(job.description, { width: COL_DESC });
          const rowH = Math.max(16, descLines + 2);

          doc.text(dateStr, MARGIN_L, y + 2, { width: COL_DATE });
          doc.text(job.vin, MARGIN_L + COL_DATE, y + 2, { width: COL_VIN });
          doc.text(job.description, MARGIN_L + COL_DATE + COL_VIN, y + 2, { width: COL_DESC });
          doc.text(formatMoney(rounded), COL_RIGHT, y + 2, { width: COL_EARN, align: 'right' });

          y += rowH;
        }

        // ── Period total ──
        doc.lineWidth(0.5).strokeColor('#ccc');
        doc.moveTo(MARGIN_L, y).lineTo(MARGIN_L + CONTENT_W, y).stroke();
        y += 6;

        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
        doc.text('Total periodo', MARGIN_L, y);
        doc.text(formatMoney(Math.round(totalPeriod * 100) / 100), COL_RIGHT, y, { width: COL_EARN, align: 'right' });
        y += 20;

        // ── Separator between periods ──
        doc.lineWidth(1).strokeColor('#000');
        doc.moveTo(MARGIN_L, y).lineTo(MARGIN_L + CONTENT_W, y).stroke();
        y += 14;
      }
    }

    // ── Grand total ──
    const totalEarned = periods.reduce((sum, p) => {
      const share = p.employeeDistribution.find(
        (s) => s.employeeId === employeeId
      );
      return sum + (share?.amount || 0);
    }, 0);

    doc.fontSize(13).font('Helvetica-Bold').fillColor('#000');
    doc.text(
      `Total ganado en el mes: ${formatMoney(totalEarned)}`,
      MARGIN_L, y, { align: 'center', width: CONTENT_W }
    );
    y += 24;

    doc.fontSize(8).fillColor('#999');
    doc.text('Generado por Tinting-JD', MARGIN_L, y, { align: 'center', width: CONTENT_W });

    doc.end();
  });
}
