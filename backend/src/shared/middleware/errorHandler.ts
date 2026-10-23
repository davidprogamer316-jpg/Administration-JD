import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err.name === 'CastError') {
    res.status(400).json({ message: 'Identificador inválido' });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({ message: 'Datos inválidos' });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    message: 'Error interno del servidor',
  });
}
