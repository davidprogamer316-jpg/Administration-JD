import { Request, Response, NextFunction } from 'express';

function clean(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(clean);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      out[key] = clean(val);
    }
    return out;
  }
  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = clean(req.body) as Record<string, unknown>;
  }
  if (req.query && typeof req.query === 'object') {
    Object.defineProperty(req, 'query', {
      value: clean(req.query),
      writable: true,
      configurable: true,
    });
  }
  if (req.params && typeof req.params === 'object') {
    Object.defineProperty(req, 'params', {
      value: clean(req.params),
      writable: true,
      configurable: true,
    });
  }
  next();
}
