import { Request, Response, NextFunction } from 'express';
import * as invoiceService from '../services/invoiceService.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const invoices = await invoiceService.list();
    res.json(invoices);
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
    const invoice = await invoiceService.getById(req.params.id as string);
    res.json(invoice);
  } catch (err: any) {
    if (err.status === 404) {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function create(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const invoice = await invoiceService.create(req.body);
    res.status(201).json(invoice);
  } catch (err: any) {
    if (err.status === 400) {
      res.status(400).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function remove(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await invoiceService.remove(req.params.id as string);
    res.json(result);
  } catch (err: any) {
    if (err.status === 404) {
      res.status(404).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function downloadPdf(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const buffer = await invoiceService.generatePdf(req.params.id as string);
    const isDownload = req.query.download === 'true';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      isDownload
        ? `attachment; filename=factura-${req.params.id}.pdf`
        : `inline; filename=factura-${req.params.id}.pdf`
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
