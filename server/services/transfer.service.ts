// =============================================================================
// GuacamoleGH Share — Servicio de Transferencias
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../db/database.js';
import { generateId, generateToken, hashToken } from '../utils/crypto.js';
import { getFilesStoragePath, sanitizeOriginalFileName } from '../utils/storage.js';

export interface CreateFileInput {
  originalName: string;
  mimeType: string;
  size: number;
}

export interface CreateTransferInput {
  expiryHours: number; // 24, 72, 168, 336 (1, 3, 7, 14 días)
  files: CreateFileInput[];
}

export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '2147483648', 10); // 2 GB
export const MAX_TRANSFER_SIZE = parseInt(process.env.MAX_TRANSFER_SIZE_BYTES || '10737418240', 10); // 10 GB

export class TransferService {
  /**
   * Crea una nueva transferencia y sus registros de archivos en estado pendiente.
   */
  static createTransfer(input: CreateTransferInput) {
    const db = getDb();

    if (!input.files || input.files.length === 0) {
      throw new Error('Debe incluir al menos un archivo en la transferencia.');
    }

    let totalTransferSize = 0;
    for (const f of input.files) {
      if (f.size > MAX_FILE_SIZE) {
        throw new Error(`El archivo "${f.originalName}" excede el límite máximo individual de 2 GB.`);
      }
      totalTransferSize += f.size;
    }

    if (totalTransferSize > MAX_TRANSFER_SIZE) {
      throw new Error(`El tamaño acumulado de la transferencia excede el límite máximo de 10 GB.`);
    }

    const transferId = generateId();
    const publicToken = generateToken(24);
    const managementToken = generateToken(32);

    const publicTokenHash = hashToken(publicToken);
    const managementTokenHash = hashToken(managementToken);

    // Calcular fecha de caducidad
    const validHours = [24, 72, 168, 336].includes(input.expiryHours) ? input.expiryHours : 24;
    const expiresAt = new Date(Date.now() + validHours * 60 * 60 * 1000).toISOString();

    const stmtTransfer = db.prepare(`
      INSERT INTO transfers (id, public_token_hash, management_token_hash, status, expires_at, total_size, file_count)
      VALUES (?, ?, ?, 'pending', ?, ?, ?)
    `);

    stmtTransfer.run(
      transferId,
      publicTokenHash,
      managementTokenHash,
      expiresAt,
      totalTransferSize,
      input.files.length
    );

    const stmtFile = db.prepare(`
      INSERT INTO files (id, transfer_id, original_name, stored_name, mime_type, size)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const createdFiles = [];

    for (const fileInput of input.files) {
      const fileId = generateId();
      const sanitizedName = sanitizeOriginalFileName(fileInput.originalName);
      // Nombre aleatorio físico fuera del alcance del cliente
      const storedName = `${generateId()}.dat`;

      stmtFile.run(
        fileId,
        transferId,
        sanitizedName,
        storedName,
        fileInput.mimeType || 'application/octet-stream',
        fileInput.size
      );

      createdFiles.push({
        id: fileId,
        originalName: sanitizedName,
        mimeType: fileInput.mimeType,
        size: fileInput.size
      });
    }

    return {
      transferId,
      publicToken,
      managementToken,
      expiresAt,
      totalSize: totalTransferSize,
      fileCount: input.files.length,
      files: createdFiles
    };
  }

  /**
   * Obtiene la información pública de una transferencia por su token público.
   */
  static getTransferByPublicToken(token: string) {
    const db = getDb();
    const publicHash = hashToken(token);

    const transfer = db.prepare(`
      SELECT id, status, created_at, completed_at, expires_at, total_size, file_count, download_count
      FROM transfers
      WHERE public_token_hash = ?
    `).get(publicHash);

    if (!transfer) {
      return null;
    }

    // Verificar si ha expirado
    const now = new Date().toISOString();
    if (transfer.expires_at < now && transfer.status !== 'expired') {
      db.prepare("UPDATE transfers SET status = 'expired' WHERE id = ?").run(transfer.id);
      transfer.status = 'expired';
    }

    if (transfer.status === 'deleted' || transfer.status === 'expired') {
      return {
        id: transfer.id,
        status: transfer.status,
        expiresAt: transfer.expires_at,
        isExpired: true,
        files: []
      };
    }

    const files = db.prepare(`
      SELECT id, original_name, mime_type, size, checksum
      FROM files
      WHERE transfer_id = ?
    `).all(transfer.id);

    return {
      id: transfer.id,
      status: transfer.status,
      createdAt: transfer.created_at,
      completedAt: transfer.completed_at,
      expiresAt: transfer.expires_at,
      totalSize: transfer.total_size,
      fileCount: transfer.file_count,
      downloadCount: transfer.download_count,
      isExpired: false,
      files: files.map((f: any) => ({
        id: f.id,
        originalName: f.original_name,
        mimeType: f.mime_type,
        size: f.size,
        checksum: f.checksum
      }))
    };
  }

  /**
   * Obtiene un archivo individual para su descarga y valida la transferencia.
   */
  static getFileForDownload(token: string, fileId: string) {
    const db = getDb();
    const publicHash = hashToken(token);

    const transfer = db.prepare(`
      SELECT id, status, expires_at
      FROM transfers
      WHERE public_token_hash = ?
    `).get(publicHash);

    if (!transfer) return null;

    if (transfer.expires_at < new Date().toISOString() || transfer.status !== 'completed') {
      return null;
    }

    const file = db.prepare(`
      SELECT id, transfer_id, original_name, stored_name, mime_type, size, checksum
      FROM files
      WHERE id = ? AND transfer_id = ?
    `).get(fileId, transfer.id);

    if (!file) return null;

    const physicalPath = path.join(getFilesStoragePath(), file.stored_name);
    if (!fs.existsSync(physicalPath)) return null;

    // Registrar evento de descarga e incrementar contador
    try {
      db.prepare(`
        INSERT INTO download_events (id, transfer_id, file_id)
        VALUES (?, ?, ?)
      `).run(generateId(), transfer.id, file.id);

      db.prepare(`
        UPDATE transfers SET download_count = download_count + 1 WHERE id = ?
      `).run(transfer.id);
    } catch {}

    return {
      ...file,
      physicalPath
    };
  }

  /**
   * Obtiene todos los archivos de una transferencia para descarga en ZIP.
   */
  static getTransferForZip(token: string) {
    const db = getDb();
    const publicHash = hashToken(token);

    const transfer = db.prepare(`
      SELECT id, status, expires_at
      FROM transfers
      WHERE public_token_hash = ?
    `).get(publicHash);

    if (!transfer) return null;

    if (transfer.expires_at < new Date().toISOString() || transfer.status !== 'completed') {
      return null;
    }

    const files = db.prepare(`
      SELECT id, original_name, stored_name, size
      FROM files
      WHERE transfer_id = ?
    `).all(transfer.id);

    const validFiles = files.map((f: any) => {
      const physicalPath = path.join(getFilesStoragePath(), f.stored_name);
      return {
        ...f,
        physicalPath,
        exists: fs.existsSync(physicalPath)
      };
    }).filter((f: any) => f.exists);

    // Incrementar contador de descargas globales
    try {
      db.prepare(`
        INSERT INTO download_events (id, transfer_id, file_id)
        VALUES (?, ?, NULL)
      `).run(generateId(), transfer.id);

      db.prepare(`
        UPDATE transfers SET download_count = download_count + 1 WHERE id = ?
      `).run(transfer.id);
    } catch {}

    return {
      transfer,
      files: validFiles
    };
  }

  /**
   * Elimina una transferencia utilizando su token de gestión.
   */
  static deleteByManagementToken(managementToken: string): boolean {
    const db = getDb();
    const mgmtHash = hashToken(managementToken);

    const transfer = db.prepare(`
      SELECT id FROM transfers WHERE management_token_hash = ?
    `).get(mgmtHash);

    if (!transfer) return false;

    return this.deleteTransferPhysically(transfer.id);
  }

  /**
   * Elimina completamente los archivos físicos y registro en DB de una transferencia.
   */
  static deleteTransferPhysically(transferId: string): boolean {
    const db = getDb();

    const files = db.prepare(`
      SELECT stored_name FROM files WHERE transfer_id = ?
    `).all(transferId);

    for (const f of files) {
      const physicalPath = path.join(getFilesStoragePath(), f.stored_name);
      if (fs.existsSync(physicalPath)) {
        try {
          fs.unlinkSync(physicalPath);
        } catch {}
      }
    }

    db.prepare('DELETE FROM transfers WHERE id = ?').run(transferId);
    return true;
  }

  /**
   * Listado de transferencias para el panel administrativo.
   */
  static listTransfersForAdmin(search?: string, statusFilter?: string) {
    const db = getDb();

    let query = `
      SELECT t.id, t.status, t.created_at, t.completed_at, t.expires_at, t.total_size, t.file_count, t.download_count,
             (SELECT COUNT(*) FROM files f WHERE f.transfer_id = t.id) as actual_files
      FROM transfers t
      WHERE 1=1
    `;
    const params: any[] = [];

    if (statusFilter && statusFilter !== 'all') {
      query += ` AND t.status = ?`;
      params.push(statusFilter);
    }

    if (search && search.trim()) {
      query += ` AND (t.id LIKE ? OR EXISTS (
        SELECT 1 FROM files f WHERE f.transfer_id = t.id AND f.original_name LIKE ?
      ))`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` ORDER BY t.created_at DESC LIMIT 100`;

    const transfers = db.prepare(query).all(...params);

    return transfers.map((t: any) => {
      const files = db.prepare(`
        SELECT id, original_name, size, mime_type, checksum
        FROM files
        WHERE transfer_id = ?
      `).all(t.id);

      return {
        ...t,
        files
      };
    });
  }
}
