import { Request, Response, NextFunction } from 'express';
import * as pdfService from '../services/pdfService.js';

export async function downloadEmployeePdf(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { year, month } = req.query as Record<string, string | undefined>;
    const employeeId = req.params.id as string;

    const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;

    const buffer = await pdfService.generateEmployeePdf(
      employeeId,
      targetYear,
      targetMonth
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=pago-empleado-${employeeId}-${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`
    );
    res.send(buffer);
  } catch (err: any) {
    if (err.status === 404) {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
}
