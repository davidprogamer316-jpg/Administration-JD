import { Request, Response, NextFunction } from 'express';
import * as fixedExpenseService from '../services/fixedExpenseService.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const expenses = await fixedExpenseService.list();
    res.json(expenses);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const expense = await fixedExpenseService.create(req.body);
    res.status(201).json(expense);
  } catch (err: any) {
    if (err.status === 400) {
      res.status(400).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const expense = await fixedExpenseService.update(req.params.id as string, req.body);
    res.json(expense);
  } catch (err: any) {
    if (err.status === 404) {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await fixedExpenseService.remove(req.params.id as string);
    res.json(result);
  } catch (err: any) {
    if (err.status === 404) {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
}
