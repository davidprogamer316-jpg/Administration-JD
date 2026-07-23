import { Request, Response, NextFunction } from 'express';
import * as carJobService from '../services/carJobService.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, vin } = req.query as Record<string, string | undefined>;
    const jobs = await carJobService.list({ startDate, endDate, vin });
    res.json(jobs);
  } catch (err) {
    next(err);
  }
}

export async function listGrouped(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate, vin } = req.query as Record<string, string | undefined>;
    const groups = await carJobService.listGrouped({ startDate, endDate, vin });
    res.json(groups);
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
    const job = await carJobService.getById(req.params.id as string);
    res.json(job);
  } catch (err) {
    next(err);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const job = await carJobService.create(req.body);
    res.status(201).json(job);
  } catch (err: any) {
    if (err.status === 400) {
      res.status(400).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function update(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const job = await carJobService.update(req.params.id as string, req.body);
    res.json(job);
  } catch (err: any) {
    if (err.status === 400 || err.status === 404) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function deactivate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await carJobService.deactivate(req.params.id as string);
    res.json(result);
  } catch (err: any) {
    if (err.status === 400 || err.status === 404) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}
