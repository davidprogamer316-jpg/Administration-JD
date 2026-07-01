import { Request, Response, NextFunction } from 'express';
import * as employeeService from '../services/employeeService.js';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await employeeService.list();
    res.json(result);
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
    const employee = await employeeService.getById(req.params.id as string);
    res.json(employee);
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
    const employee = await employeeService.create(req.body);
    res.status(201).json(employee);
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
    const employee = await employeeService.update(req.params.id as string, req.body);
    res.json(employee);
  } catch (err: any) {
    if (err.status === 400 || err.status === 404) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function toggleActive(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const employee = await employeeService.toggleActive(req.params.id as string);
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await employeeService.remove(req.params.id as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
