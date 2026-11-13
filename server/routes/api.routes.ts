// =============================================================================
// GuacamoleGH Share — Definición de Rutas API REST
// =============================================================================

import { Router } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { TransferController } from '../controllers/transfer.controller.js';
import { UploadController } from '../controllers/upload.controller.js';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middleware/auth.middleware.js';
import { verifyTurnstile } from '../middleware/turnstile.middleware.js';
import { getDb } from '../db/database.js';

export const apiRouter = Router();

// Limitadores de peticiones (Rate Limiters)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas solicitudes. Por favor intente más tarde.' }
});

const createTransferLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Límite de creación de transferencias alcanzado temporalmente.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de acceso fallidos. Bloqueado temporalmente.' }
});

// Middleware de raw binary para recibir chunks de hasta 10 MB
const rawBodyParser = express.raw({
  type: '*/*',
  limit: '15mb'
});

// ---------------------------------------------------------------------------
// Healthcheck
// ---------------------------------------------------------------------------
apiRouter.get('/health', (_req, res) => {
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok',
      service: 'guacamolegh-share',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Transferencias y Subidas Públicas
// ---------------------------------------------------------------------------
apiRouter.post('/transfers', createTransferLimiter, verifyTurnstile, TransferController.create);
apiRouter.get('/transfers/:token', generalLimiter, TransferController.getPublic);
apiRouter.delete('/manage/:token', generalLimiter, TransferController.deleteByManagementToken);
apiRouter.post('/manage/:token/close', generalLimiter, TransferController.deleteByManagementToken);
apiRouter.post('/manage/:token/ping', generalLimiter, TransferController.pingEphemeral);

// Sesiones de subida y fragmentos
apiRouter.post('/uploads', generalLimiter, UploadController.initSession);
apiRouter.put('/uploads/:id/chunks/:index', rawBodyParser, UploadController.uploadChunk);
apiRouter.post('/uploads/:id/complete', generalLimiter, UploadController.completeSession);

// Descargas públicas
apiRouter.get('/download/:token/:fileId', generalLimiter, TransferController.downloadFile);
apiRouter.get('/download/:token/zip', generalLimiter, TransferController.downloadZip);

// ---------------------------------------------------------------------------
// Panel de Administración (Privado)
// ---------------------------------------------------------------------------
apiRouter.post('/admin/login', loginLimiter, AdminController.login);
apiRouter.post('/admin/logout', AdminController.logout);
apiRouter.get('/admin/check', requireAdmin, AdminController.checkAuth);
apiRouter.get('/admin/transfers', requireAdmin, AdminController.listTransfers);
apiRouter.delete('/admin/transfers/:id', requireAdmin, AdminController.deleteTransfer);
apiRouter.get('/admin/storage', requireAdmin, AdminController.getStorage);
