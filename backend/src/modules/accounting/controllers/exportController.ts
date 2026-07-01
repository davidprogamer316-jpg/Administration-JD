import { Request, Response, NextFunction } from 'express';
import * as exportService from '../services/exportService.js';

export async function exportAccounting(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;
    const buffer = await exportService.exportAccountingExcel({ startDate, endDate });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=contabilidad-${new Date().toISOString().split('T')[0]}.xlsx`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

export async function exportCarJobs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;
    const buffer = await exportService.exportCarJobsExcel({ startDate, endDate });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=trabajos-${new Date().toISOString().split('T')[0]}.xlsx`
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
