import PDFDocument from 'pdfkit';
import { AccountingPeriod } from '../../accounting/models/index.js';
import { CarJob, ICarJob } from '../../carJobs/models/index.js';
import { Employee } from '../models/index.js';

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

  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
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

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('Tinting-JD ERP', { align: 'center' });

    doc
      .fontSize(14)
      .font('Helvetica')
      .text(`Historial de pagos - ${employee.name}`, { align: 'center' });

    const monthName = new Date(year, month - 1).toLocaleDateString('es-ES', {
      month: 'long',
      year: 'numeric',
    });

    doc.fontSize(11).text(`Mes: ${monthName}`, { align: 'center' });
    doc.moveDown();

    if (periods.length === 0) {
      doc
        .fontSize(11)
        .text('No hay periodos registrados para este mes.', {
          align: 'center',
        });
    } else {
      for (const period of periods) {
        const share = period.employeeDistribution.find(
          (s) => s.employeeId === employeeId
        );

        if (!share) continue;

        const label = `Q${period.periodNumber}: ${period.periodStartDate.toLocaleDateString('es-ES')} - ${period.periodEndDate.toLocaleDateString('es-ES')}`;

        doc.moveDown(0.5);

        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#1B1B2F')
          .text(label, { continued: false });

        const jobs = jobsByPeriod[period._id.toString()] || [];

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#2D2A3D');

        for (const job of jobs) {
          const proportion =
            period.income > 0
              ? (job.payment / period.income) * share.amount
              : 0;

          doc.text(
            `  ${job.date.toLocaleDateString('es-ES')} | ${job.vin} | ${job.description.substring(0, 40)} - Ganancia: $${proportion.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
            { indent: 10 }
          );
        }

        doc
          .font('Helvetica-Bold')
          .fillColor('#5B8C6B')
          .text(
            `  Total periodo: $${share.amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
            { indent: 10 }
          );

        doc.moveDown(0.3);

        doc
          .strokeColor('#E5E0D8')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();
      }
    }

    const totalEarned = periods.reduce((sum, p) => {
      const share = p.employeeDistribution.find(
        (s) => s.employeeId === employeeId
      );
      return sum + (share?.amount || 0);
    }, 0);

    doc.moveDown();
    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#1B1B2F')
      .text(
        `Total ganado en el mes: $${totalEarned.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
        { align: 'center' }
      );

    doc
      .fontSize(8)
      .fillColor('#8B7D8B')
      .text('Generado por Tinting-JD ERP', { align: 'center' });

    doc.end();
  });
}
