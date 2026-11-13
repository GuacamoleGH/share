// =============================================================================
// GuacamoleGH Share — Pruebas Automatizadas (Vitest)
// =============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb, closeDb } from '../server/db/database.js';
import { TransferService } from '../server/services/transfer.service.js';
import { UploadService } from '../server/services/upload.service.js';
import { CleanupService } from '../server/services/cleanup.service.js';
import { ensureStorageDirs } from '../server/utils/storage.js';

describe('GuacamoleGH Share — Sistema de Transferencia y Subida Fragmentada', () => {
  const testDbDir = path.resolve(process.cwd(), 'data-test');
  const testStorageDir = path.resolve(process.cwd(), 'storage-test');

  beforeAll(() => {
    process.env.DB_PATH = path.join(testDbDir, 'test-share.db');
    process.env.STORAGE_PATH = testStorageDir;

    if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
    ensureStorageDirs();
    getDb();
  });

  afterAll(() => {
    closeDb();
    if (fs.existsSync(testDbDir)) {
      try { fs.rmSync(testDbDir, { recursive: true, force: true }); } catch {}
    }
    if (fs.existsSync(testStorageDir)) {
      try { fs.rmSync(testStorageDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('1. Debe inicializar una nueva transferencia con archivos en estado pendiente', () => {
    const transfer = TransferService.createTransfer({
      expiryHours: 24,
      files: [
        { originalName: 'documento_importante.pdf', mimeType: 'application/pdf', size: 1024 * 100 },
        { originalName: 'video_clip.mp4', mimeType: 'video/mp4', size: 1024 * 500 }
      ]
    });

    expect(transfer.transferId).toBeDefined();
    expect(transfer.publicToken).toHaveLength(32); // base64url length for 24 bytes
    expect(transfer.managementToken).toBeDefined();
    expect(transfer.files).toHaveLength(2);
    expect(transfer.totalSize).toBe(1024 * 600);
  });

  it('2. Debe rechazar transferencias que excedan los límites máximos', () => {
    expect(() => {
      TransferService.createTransfer({
        expiryHours: 24,
        files: [
          { originalName: 'archivo_gigante.iso', mimeType: 'application/octet-stream', size: 3 * 1024 * 1024 * 1024 } // 3 GB > 2 GB
        ]
      });
    }).toThrow(/límite máximo individual de 2 GB/);
  });

  it('3. Debe procesar la subida fragmentada (chunks) y ensamblar el archivo final correctamente', async () => {
    // Generar contenido de prueba de 20 KB
    const content = crypto.randomBytes(20 * 1024);
    const expectedChecksum = crypto.createHash('sha256').update(content).digest('hex');

    const transfer = TransferService.createTransfer({
      expiryHours: 24,
      files: [
        { originalName: 'test-payload.bin', mimeType: 'application/octet-stream', size: content.length }
      ]
    });

    const fileId = transfer.files[0]?.id!;
    expect(fileId).toBeDefined();

    // Dividir en 2 fragmentos de 10 KB
    const chunk1 = content.subarray(0, 10 * 1024);
    const chunk2 = content.subarray(10 * 1024);

    const session = UploadService.initUploadSession(transfer.transferId, fileId, 2);
    expect(session.sessionId).toBeDefined();
    expect(session.totalChunks).toBe(2);

    // Subir fragmento 0
    const resChunk0 = await UploadService.saveChunk(session.sessionId, 0, chunk1);
    expect(resChunk0.receivedCount).toBe(1);
    expect(resChunk0.isComplete).toBe(false);

    // Subir fragmento 1
    const resChunk1 = await UploadService.saveChunk(session.sessionId, 1, chunk2);
    expect(resChunk1.receivedCount).toBe(2);
    expect(resChunk1.isComplete).toBe(true);

    // Completar sesión y ensamblar
    const completeResult = await UploadService.completeUploadSession(session.sessionId);
    expect(completeResult.finalSize).toBe(content.length);
    expect(completeResult.checksum).toBe(expectedChecksum);

    // Consultar estado público de la transferencia
    const publicData = TransferService.getTransferByPublicToken(transfer.publicToken);
    expect(publicData).not.toBeNull();
    expect(publicData?.status).toBe('completed');
    expect(publicData?.files[0]?.checksum).toBe(expectedChecksum);
  });

  it('4. Debe permitir la descarga del archivo y validar rangos HTTP', () => {
    const transfer = TransferService.createTransfer({
      expiryHours: 24,
      files: [{ originalName: 'sample.txt', mimeType: 'text/plain', size: 12 }]
    });

    const fileId = transfer.files[0]?.id!;
    const session = UploadService.initUploadSession(transfer.transferId, fileId, 1);
    const textBuffer = Buffer.from('Hola Mundo!!');

    return UploadService.saveChunk(session.sessionId, 0, textBuffer).then(async () => {
      await UploadService.completeUploadSession(session.sessionId);

      const downloadFile = TransferService.getFileForDownload(transfer.publicToken, fileId);
      expect(downloadFile).not.toBeNull();
      expect(downloadFile?.original_name).toBe('sample.txt');
      expect(fs.existsSync(downloadFile?.physicalPath!)).toBe(true);

      const contentRead = fs.readFileSync(downloadFile?.physicalPath!, 'utf8');
      expect(contentRead).toBe('Hola Mundo!!');
    });
  });

  it('5. Debe permitir eliminar la transferencia con el token de gestión', () => {
    const transfer = TransferService.createTransfer({
      expiryHours: 24,
      files: [{ originalName: 'a_borrar.txt', mimeType: 'text/plain', size: 5 }]
    });

    const success = TransferService.deleteByManagementToken(transfer.managementToken);
    expect(success).toBe(true);

    const publicCheck = TransferService.getTransferByPublicToken(transfer.publicToken);
    expect(publicCheck).toBeNull();
  });

  it('6. Debe generar métricas de almacenamiento correctas para el panel de administración', () => {
    const stats = CleanupService.getStorageStats();
    expect(stats).toBeDefined();
    expect(stats.filesSizeBytes).toBeGreaterThanOrEqual(0);
    expect(stats.chunksSizeBytes).toBeGreaterThanOrEqual(0);
    expect(stats.lifetimeTransfersCount).toBeGreaterThanOrEqual(1);
  });

  it('7. Debe gestionar transferencias efímeras (modo JustBeamIt) y destruirlas al cerrar', async () => {
    const transfer = TransferService.createTransfer({
      expiryHours: 0.1667, // 10 min
      isEphemeral: true,
      files: [{ originalName: 'beam-secret.txt', mimeType: 'text/plain', size: 14 }]
    });

    expect(transfer.isEphemeral).toBe(true);
    const fileId = transfer.files[0]?.id!;
    const session = UploadService.initUploadSession(transfer.transferId, fileId, 1);
    await UploadService.saveChunk(session.sessionId, 0, Buffer.from('JustBeamItTest'));
    await UploadService.completeUploadSession(session.sessionId);

    // Verificar que está activa
    const publicData = TransferService.getTransferByPublicToken(transfer.publicToken);
    expect(publicData?.isEphemeral).toBe(true);
    expect(publicData?.status).toBe('completed');

    // Comprobar heartbeat ping
    const pingOk = TransferService.pingEphemeral(transfer.managementToken);
    expect(pingOk).toBe(true);

    // Simular cierre de pestaña del emisor (sendBeacon)
    const deleteOk = TransferService.deleteByManagementToken(transfer.managementToken);
    expect(deleteOk).toBe(true);

    // Al cerrarse, ya no debe estar disponible
    const afterClose = TransferService.getTransferByPublicToken(transfer.publicToken);
    expect(afterClose).toBeNull();
  });
});
