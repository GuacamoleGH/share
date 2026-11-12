// =============================================================================
// GuacamoleGH Share — Controlador de Subidas Fragmentadas
// =============================================================================

import { Request, Response } from 'express';
import { UploadService } from '../services/upload.service.js';

export class UploadController {
  /**
   * POST /api/uploads
   * Inicia la sesión de subida para un archivo específico de una transferencia.
   */
  static initSession(req: Request, res: Response) {
    try {
      const { transferId, fileId, totalChunks } = req.body;

      if (!transferId || !fileId || !totalChunks) {
        res.status(400).json({ error: 'Faltan parámetros requeridos (transferId, fileId, totalChunks).' });
        return;
      }

      const session = UploadService.initUploadSession(transferId, fileId, Number(totalChunks));
      res.status(201).json(session);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al iniciar la sesión de subida.' });
    }
  }

  /**
   * PUT /api/uploads/:id/chunks/:index
   * Recibe el contenido binario del fragmento en el body de la petición.
   */
  static async uploadChunk(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      const chunkIndex = parseInt((req.params.index as string) || '', 10);
      const expectedChecksum = req.headers['x-chunk-checksum'] as string | undefined;

      if (!sessionId || isNaN(chunkIndex)) {
        res.status(400).json({ error: 'Identificador de sesión o índice de fragmento inválido.' });
        return;
      }

      const chunkBuffer = req.body as Buffer;
      if (!Buffer.isBuffer(chunkBuffer) || chunkBuffer.length === 0) {
        res.status(400).json({ error: 'El cuerpo de la petición debe contener el fragmento binario.' });
        return;
      }

      const result = await UploadService.saveChunk(
        sessionId,
        chunkIndex,
        chunkBuffer,
        expectedChecksum
      );

      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al procesar el fragmento.' });
    }
  }

  /**
   * POST /api/uploads/:id/complete
   * Ensambla todos los fragmentos y consolida el archivo final.
   */
  static async completeSession(req: Request, res: Response) {
    try {
      const sessionId = req.params.id as string;
      if (!sessionId) {
        res.status(400).json({ error: 'Identificador de sesión no proporcionado.' });
        return;
      }

      const result = await UploadService.completeUploadSession(sessionId);
      res.json({
        message: 'Archivo ensamblado y verificado correctamente.',
        ...result
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al completar la subida.' });
    }
  }
}
