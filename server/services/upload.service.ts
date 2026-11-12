// =============================================================================
// GuacamoleGH Share — Servicio de Subidas Fragmentadas (Chunked Uploads)
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from '../db/database.js';
import { generateId } from '../utils/crypto.js';
import { getChunksStoragePath, getFilesStoragePath } from '../utils/storage.js';

export class UploadService {
  /**
   * Inicia una sesión de subida fragmentada para un archivo concreto de una transferencia.
   */
  static initUploadSession(transferId: string, fileId: string, totalChunks: number) {
    const db = getDb();

    // Validar transferencia
    const transfer = db.prepare(`
      SELECT id, status FROM transfers WHERE id = ?
    `).get(transferId);

    if (!transfer || transfer.status !== 'pending') {
      throw new Error('La transferencia no es válida o no está en estado pendiente.');
    }

    // Validar archivo
    const file = db.prepare(`
      SELECT id, transfer_id, size FROM files WHERE id = ? AND transfer_id = ?
    `).get(fileId, transferId);

    if (!file) {
      throw new Error('El archivo no pertenece a la transferencia indicada.');
    }

    // Verificar si ya existe una sesión activa para este archivo
    const existingSession = db.prepare(`
      SELECT id, status, total_chunks, received_chunks
      FROM upload_sessions
      WHERE transfer_id = ? AND file_id = ? AND status = 'active'
    `).get(transferId, fileId);

    if (existingSession) {
      const sessionDir = path.join(getChunksStoragePath(), existingSession.id);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      return {
        sessionId: existingSession.id,
        totalChunks: existingSession.total_chunks,
        receivedChunks: existingSession.received_chunks
      };
    }

    const sessionId = generateId();
    const sessionDir = path.join(getChunksStoragePath(), sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    db.prepare(`
      INSERT INTO upload_sessions (id, transfer_id, file_id, total_chunks, received_chunks, status)
      VALUES (?, ?, ?, ?, 0, 'active')
    `).run(sessionId, transferId, fileId, totalChunks);

    return {
      sessionId,
      totalChunks,
      receivedChunks: 0
    };
  }

  /**
   * Guarda un fragmento binario en disco y registra el chunk en SQLite.
   */
  static async saveChunk(
    sessionId: string,
    chunkIndex: number,
    chunkBuffer: Buffer,
    expectedChecksum?: string
  ) {
    const db = getDb();

    const session = db.prepare(`
      SELECT id, total_chunks, status
      FROM upload_sessions
      WHERE id = ?
    `).get(sessionId);

    if (!session || session.status !== 'active') {
      throw new Error('Sesión de subida inexistente o inactiva.');
    }

    if (chunkIndex < 0 || chunkIndex >= session.total_chunks) {
      throw new Error(`Índice de fragmento fuera de rango: ${chunkIndex} (Total: ${session.total_chunks})`);
    }

    // Comprobar checksum del chunk si se envió
    const actualChecksum = crypto.createHash('sha256').update(chunkBuffer).digest('hex');
    if (expectedChecksum && expectedChecksum.toLowerCase() !== actualChecksum.toLowerCase()) {
      throw new Error('Error de integridad en el fragmento (Checksum mismatch).');
    }

    const sessionDir = path.join(getChunksStoragePath(), sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const chunkFilePath = path.join(sessionDir, `chunk_${chunkIndex}.part`);
    fs.writeFileSync(chunkFilePath, chunkBuffer);

    // Registrar o actualizar chunk de forma idempotente
    const chunkId = generateId();
    db.prepare(`
      INSERT INTO upload_chunks (id, session_id, chunk_index, size, checksum)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(session_id, chunk_index) DO UPDATE SET
        size = excluded.size,
        checksum = excluded.checksum,
        received_at = CURRENT_TIMESTAMP
    `).run(chunkId, sessionId, chunkIndex, chunkBuffer.length, actualChecksum);

    // Contar fragmentos recibidos reales
    const countResult = db.prepare(`
      SELECT COUNT(*) as count FROM upload_chunks WHERE session_id = ?
    `).get(sessionId);

    const receivedCount = countResult ? countResult.count : 0;

    db.prepare(`
      UPDATE upload_sessions SET received_chunks = ? WHERE id = ?
    `).run(receivedCount, sessionId);

    return {
      chunkIndex,
      receivedCount,
      totalChunks: session.total_chunks,
      isComplete: receivedCount >= session.total_chunks
    };
  }

  /**
   * Finaliza la sesión: ensambla los fragmentos secuencialmente en streaming, calcula SHA-256,
   * valida integridad y limpia los archivos temporales.
   */
  static async completeUploadSession(sessionId: string): Promise<{ checksum: string; finalSize: number }> {
    const db = getDb();

    const session = db.prepare(`
      SELECT s.id, s.transfer_id, s.file_id, s.total_chunks, s.received_chunks, s.status,
             f.stored_name, f.size as expected_size, f.original_name
      FROM upload_sessions s
      JOIN files f ON s.file_id = f.id
      WHERE s.id = ?
    `).get(sessionId);

    if (!session) {
      throw new Error('Sesión de subida no encontrada.');
    }

    if (session.received_chunks < session.total_chunks) {
      throw new Error(`Subida incompleta: faltan fragmentos (${session.received_chunks}/${session.total_chunks}).`);
    }

    // Marcar como ensamblando
    db.prepare("UPDATE upload_sessions SET status = 'assembling' WHERE id = ?").run(sessionId);

    const sessionDir = path.join(getChunksStoragePath(), sessionId);
    const destinationPath = path.join(getFilesStoragePath(), session.stored_name);

    // Asegurar directorio de destino
    const filesDir = getFilesStoragePath();
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    // Ensamblar los fragmentos secuencialmente en el archivo final sin consumir RAM
    const writeStream = fs.createWriteStream(destinationPath, { flags: 'w' });
    const hash = crypto.createHash('sha256');
    let totalBytesWritten = 0;

    try {
      for (let i = 0; i < session.total_chunks; i++) {
        const chunkPath = path.join(sessionDir, `chunk_${i}.part`);
        if (!fs.existsSync(chunkPath)) {
          throw new Error(`No se encontró el fragmento físico ${i} para ensamblar.`);
        }

        await new Promise<void>((resolve, reject) => {
          const chunkReadStream = fs.createReadStream(chunkPath);
          chunkReadStream.on('data', (data) => {
            hash.update(data);
            totalBytesWritten += data.length;
          });
          chunkReadStream.on('end', () => resolve());
          chunkReadStream.on('error', (err) => reject(err));
          chunkReadStream.pipe(writeStream, { end: false });
        });
      }

      await new Promise<void>((resolve, reject) => {
        writeStream.end(() => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      const finalChecksum = hash.digest('hex');

      // Validar tamaño si era conocido
      if (session.expected_size > 0 && totalBytesWritten !== session.expected_size) {
        throw new Error(`Discrepancia en el tamaño final: esperado ${session.expected_size}, obtenido ${totalBytesWritten}`);
      }

      // Actualizar archivo con checksum y tamaño real
      db.prepare(`
        UPDATE files SET checksum = ?, size = ? WHERE id = ?
      `).run(finalChecksum, totalBytesWritten, session.file_id);

      // Marcar sesión como completada
      db.prepare("UPDATE upload_sessions SET status = 'completed' WHERE id = ?").run(sessionId);

      // Limpiar fragmentos temporales y carpeta de sesión
      try {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      } catch {}

      // Comprobar si TODOS los archivos de la transferencia ya están completados
      const pendingFiles = db.prepare(`
        SELECT COUNT(*) as count
        FROM files f
        WHERE f.transfer_id = ?
          AND (f.checksum IS NULL OR NOT EXISTS (
            SELECT 1 FROM upload_sessions us
            WHERE us.file_id = f.id AND us.status = 'completed'
          ))
      `).get(session.transfer_id);

      if (pendingFiles && pendingFiles.count === 0) {
        // Toda la transferencia está lista
        db.prepare(`
          UPDATE transfers
          SET status = 'completed', completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(session.transfer_id);
      }

      return {
        checksum: finalChecksum,
        finalSize: totalBytesWritten
      };
    } catch (err) {
      db.prepare("UPDATE upload_sessions SET status = 'failed' WHERE id = ?").run(sessionId);
      if (fs.existsSync(destinationPath)) {
        try { fs.unlinkSync(destinationPath); } catch {}
      }
      throw err;
    }
  }
}
