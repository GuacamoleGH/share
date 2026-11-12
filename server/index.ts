// =============================================================================
// GuacamoleGH Share — Servidor Principal Express
// Homelab GuacamoleGH (https://github.com/GuacamoleGH/share)
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getDb } from './db/database.js';
import { ensureStorageDirs } from './utils/storage.js';
import { CleanupService } from './services/cleanup.service.js';
import { apiRouter } from './routes/api.routes.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Inicializar base de datos y directorios de persistencia
try {
  getDb();
  ensureStorageDirs();
  console.log('[GuacamoleGH Share] Base de datos SQLite y almacenamiento verificados.');
} catch (err) {
  console.error('[GuacamoleGH Share Fatal] Error al iniciar la persistencia:', err);
  process.exit(1);
}

// Iniciar tarea periódica de limpieza de transferencias expiradas y sesiones huérfanas
CleanupService.startPeriodicCleanup(15);

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Permitir Vite / React inline scripts y SVGs locales
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));

// Montar API REST
app.use('/api', apiRouter);

// Servir estáticos en producción o desarrollo compilado
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));

  // SPA fallback para rutas como /d/:token y /admin
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Middleware de control de errores no capturados
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ error: 'Error interno en el servidor GuacamoleGH Share.' });
});

// Arrancar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[GuacamoleGH Share] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
  console.log(`[GuacamoleGH Share] Modo: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
