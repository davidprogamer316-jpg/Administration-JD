import { Router } from 'express';
import * as quoteService from '../services/quoteService.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const quotes = await quoteService.list();
    res.json(quotes);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const quote = await quoteService.getById(req.params.id);
    res.json(quote);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const pdfBuffer = await quoteService.generatePdf(req.params.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="quotation.pdf"',
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const quote = await quoteService.create(req.body);
    res.status(201).json(quote);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const quote = await quoteService.update(req.params.id, req.body);
    res.json(quote);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await quoteService.remove(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
