import { Request, Response, NextFunction } from 'express';
import * as paperTypeService from '../services/paperTypeService.js';

export async function list(_req: Request, res: Response, next: NextFunction) {
  try {
    const paperTypes = await paperTypeService.list();
    res.json(paperTypes);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const paper = await paperTypeService.create({
      label: req.body?.label,
      specs: req.body?.specs,
    });
    res.status(201).json(paper);
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
    const paper = await paperTypeService.update(req.params.id as string, {
      label: req.body?.label,
      specs: req.body?.specs,
    });
    res.json(paper);
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
    const paper = await paperTypeService.toggleActive(req.params.id as string);
    res.json(paper);
  } catch (err: any) {
    if (err.status === 404) {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
}
