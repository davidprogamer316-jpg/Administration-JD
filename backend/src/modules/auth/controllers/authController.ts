import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../../shared/middleware/authenticate';
import * as authService from '../services/authService';

export async function register(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password, fullName } = req.body;
    const result = await authService.register(email, password, fullName);
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message?.includes('registro') || err.message?.includes('correo')) {
      res.status(400).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function login(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: any) {
    if (err.status === 423) {
      res.status(423).json({ message: err.message, locked: true });
      return;
    }
    if (err.status === 401) {
      res.status(401).json({ message: err.message });
      return;
    }
    next(err);
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await authService.getMe(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function unlock(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await authService.unlockAccount(req.userId!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.userId!,
      currentPassword,
      newPassword
    );
    res.json(result);
  } catch (err: any) {
    if (err.status === 400) {
      res.status(400).json({ message: err.message });
      return;
    }
    next(err);
  }
}
