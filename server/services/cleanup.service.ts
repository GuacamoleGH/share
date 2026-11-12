// =============================================================================
// GuacamoleGH Share — Servicio de Limpieza Automática y Métricas de Disco
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../db/database.js';
import { getChunksStoragePath, getDirectorySize, getFilesStoragePath } from '../utils/storage.js';

export class CleanupService {
  /**
   * Pasa a estado 'expired' y elimina del disco los archivos de transferencias caducadas.
   */
  static cleanupExpiredTransfers(): number {
    const db = getDb();
    const now = new Date().toISOString();

    const expired = db.prepare(`
      SELECT id FROM transfers
      WHERE expires_at < ? AND status NOT IN ('expired', 'deleted')
    `).all(now);

    let cleanedCount = 0;
    const filesDir = getFilesStoragePath();

    for (const t of expired) {
      const files = db.prepare(`
        SELECT stored_name FROM files WHERE transfer_id = ?
      `).all(t.id);

      for (const f of files) {
        const filePath = path.join(filesDir, f.stored_name);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {}
        }
      }

      db.prepare("UPDATE transfers SET status = 'expired' WHERE id = ?").run(t.id);
      cleanedCount++;
    }

    return cleanedCount;
  }

  /**
   * Elimina sesiones de subida abandonadas hace más de 2 horas y sus fragmentos temporales.
   */
  static cleanupAbandonedSessions(maxAgeHours = 2): number {
    const db = getDb();
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

    const abandoned = db.prepare(`
      SELECT id FROM upload_sessions
      WHERE status IN ('active', 'failed') AND created_at < ?
    `).all(cutoffDate);

    let cleanedCount = 0;
    const chunksDir = getChunksStoragePath();

    for (const s of abandoned) {
      const sessionPath = path.join(chunksDir, s.id);
      if (fs.existsSync(sessionPath)) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        } catch {}
      }

      db.prepare('DELETE FROM upload_sessions WHERE id = ?').run(s.id);
      cleanedCount++;
    }

    return cleanedCount;
  }

  /**
   * Obtiene estadísticas de uso de almacenamiento físico en el homelab.
   */
  static getStorageStats() {
    const db = getDb();
    const filesSize = getDirectorySize(getFilesStoragePath());
    const chunksSize = getDirectorySize(getChunksStoragePath());

    const activeTransfers = db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_size), 0) as total_size, COALESCE(SUM(download_count), 0) as total_downloads
      FROM transfers
      WHERE status = 'completed' AND expires_at > ?
    `).get(new Date().toISOString());

    const totalTransfers = db.prepare(`
      SELECT COUNT(*) as count FROM transfers
    `).get();

    return {
      filesSizeBytes: filesSize,
      chunksSizeBytes: chunksSize,
      totalStorageUsedBytes: filesSize + chunksSize,
      activeTransfersCount: activeTransfers ? activeTransfers.count : 0,
      activeTransfersSize: activeTransfers ? activeTransfers.total_size : 0,
      totalDownloads: activeTransfers ? activeTransfers.total_downloads : 0,
      lifetimeTransfersCount: totalTransfers ? totalTransfers.count : 0
    };
  }

  /**
   * Inicia el ciclo periódico de mantenimiento cada N minutos.
   */
  static startPeriodicCleanup(intervalMinutes = 15): NodeJS.Timeout {
    return setInterval(() => {
      try {
        const expired = this.cleanupExpiredTransfers();
        const abandoned = this.cleanupAbandonedSessions();
        if (expired > 0 || abandoned > 0) {
          console.log(`[Cleanup Cron] Purgadas ${expired} transferencias expiradas y ${abandoned} sesiones huérfanas.`);
        }
      } catch (err) {
        console.error('[Cleanup Cron Error]', err);
      }
    }, intervalMinutes * 60 * 1000);
  }
}
