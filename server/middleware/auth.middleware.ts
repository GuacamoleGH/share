// =============================================================================
// GuacamoleGH Share — Middleware de Autenticación de Administrador
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/crypto.js';

export interface AuthenticatedRequest extends Request {
  user?: { role: string };
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.admin_session || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Acceso no autorizado. Inicie sesión como administrador.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { role: string };
    if (decoded.role !== 'admin') {
      res.status(403).json({ error: 'Permisos insuficientes.' });
      return;
    }
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
}
