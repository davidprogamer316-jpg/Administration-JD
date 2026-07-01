import { Request, Response, NextFunction } from 'express';
import * as accountingService from '../services/accountingService.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query as Record<string, string | undefined>;
    const periods = await accountingService.list({ startDate, endDate });
    res.json(periods);
  } catch (err) {
    next(err);
  }
}

export async function getById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await accountingService.getById(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function addExpenseItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const period = await accountingService.addExpenseItem(
      req.params.id as string,
      req.body
    );
    res.status(201).json(period);
  } catch (err: any) {
    if (err.status === 400 || err.status === 404) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function updateExpenseItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const period = await accountingService.updateExpenseItem(
      req.params.id as string,
      req.params.itemId as string,
      req.body
    );
    res.json(period);
  } catch (err: any) {
    if (err.status === 400 || err.status === 404) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function removeExpenseItem(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const period = await accountingService.removeExpenseItem(
      req.params.id as string,
      req.params.itemId as string
    );
    res.json(period);
  } catch (err: any) {
    if (err.status === 400 || err.status === 404) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function closePeriod(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const period = await accountingService.closePeriod(req.params.id as string);
    res.json(period);
  } catch (err: any) {
    if (err.status === 400 || err.status === 404) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function recalculate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const period = await accountingService.recalculateById(
      req.params.id as string
    );
    res.json(period);
  } catch (err: any) {
    if (err.status === 400 || err.status === 404) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}
