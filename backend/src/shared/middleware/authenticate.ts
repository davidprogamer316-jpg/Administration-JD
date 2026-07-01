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
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Token requerido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string };
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
}
