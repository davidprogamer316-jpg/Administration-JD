import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboardService.js';

export async function getDashboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;
    const data = await dashboardService.getDashboard({ startDate, endDate });
    res.json(data);
  } catch (err) {
    next(err);
  }
}
