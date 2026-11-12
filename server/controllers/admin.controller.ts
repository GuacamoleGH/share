// =============================================================================
// GuacamoleGH Share — Controlador del Panel de Administración
// =============================================================================

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { comparePassword, getJwtSecret } from '../utils/crypto.js';
import { TransferService } from '../services/transfer.service.js';
import { CleanupService } from '../services/cleanup.service.js';

export class AdminController {
  /**
   * POST /api/admin/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;

      if (!password) {
        res.status(400).json({ error: 'Debe ingresar la contraseña de administrador.' });
        return;
      }

      const configuredHash = process.env.ADMIN_PASSWORD_HASH;

      let isValid = false;
      if (configuredHash && configuredHash.startsWith('$2')) {
        isValid = await comparePassword(password, configuredHash);
      } else {
        // En homelab inicial sin hash fijado, permite una clave por defecto para configuración
        isValid = password === (process.env.ADMIN_PASSWORD || 'guacamolegh');
      }

      if (!isValid) {
        res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
        return;
      }

      const token = jwt.sign(
        { role: 'admin', loggedAt: Date.now() },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('admin_session', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
      });

      res.json({ message: 'Inicio de sesión administrativo exitoso.' });
    } catch (err: any) {
      console.error('[Admin Login Error]', err);
      res.status(500).json({ error: 'Error interno en la autenticación.' });
    }
  }

  /**
   * POST /api/admin/logout
   */
  static logout(_req: Request, res: Response): void {
    res.clearCookie('admin_session');
    res.json({ message: 'Sesión administrativa cerrada.' });
  }

  /**
   * GET /api/admin/check
   */
  static checkAuth(_req: Request, res: Response): void {
    res.json({ authenticated: true, role: 'admin' });
  }

  /**
   * GET /api/admin/transfers
   */
  static listTransfers(req: Request, res: Response): void {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;

      const transfers = TransferService.listTransfersForAdmin(search, status);
      res.json(transfers);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al obtener el listado de transferencias.' });
    }
  }

  /**
   * DELETE /api/admin/transfers/:id
   */
  static deleteTransfer(req: Request, res: Response): void {
    try {
      const id = req.params.id as string;
      if (!id) {
        res.status(400).json({ error: 'ID de transferencia requerido.' });
        return;
      }

      const deleted = TransferService.deleteTransferPhysically(id);
      if (!deleted) {
        res.status(404).json({ error: 'Transferencia no encontrada.' });
        return;
      }

      res.json({ message: 'Transferencia eliminada por el administrador.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al eliminar la transferencia.' });
    }
  }

  /**
   * GET /api/admin/storage
   */
  static getStorage(_req: Request, res: Response): void {
    try {
      const stats = CleanupService.getStorageStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar las estadísticas de almacenamiento.' });
    }
  }
}
