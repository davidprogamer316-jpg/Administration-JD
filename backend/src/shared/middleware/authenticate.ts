import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : undefined;

  if (!token) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      algorithms: ['HS256'],
    }) as { id?: unknown };
    if (typeof decoded.id !== 'string' || !decoded.id) {
      res.status(401).json({ message: 'Token inválido o expirado' });
      return;
    }
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
}
