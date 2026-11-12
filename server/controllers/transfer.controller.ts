// =============================================================================
// GuacamoleGH Share — Controlador de Transferencias y Descargas
// =============================================================================

import { Request, Response } from 'express';
import fs from 'node:fs';
import { TransferService } from '../services/transfer.service.js';
import { ZipStreamService } from '../services/zip.service.js';

export class TransferController {
  /**
   * POST /api/transfers
   * Crea una nueva transferencia con archivos en estado pendiente.
   */
  static create(req: Request, res: Response) {
    try {
      const { expiryHours, files } = req.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        res.status(400).json({ error: 'La transferencia debe contener al menos un archivo.' });
        return;
      }

      const result = TransferService.createTransfer({
        expiryHours: Number(expiryHours) || 24,
        files
      });

      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error al iniciar la transferencia.' });
    }
  }

  /**
   * GET /api/transfers/:token
   * Devuelve los metadatos públicos de una transferencia.
   */
  static getPublic(req: Request, res: Response) {
    try {
      const token = req.params.token as string;
      if (!token) {
        res.status(400).json({ error: 'Token no proporcionado.' });
        return;
      }

      const transfer = TransferService.getTransferByPublicToken(token);
      if (!transfer) {
        res.status(404).json({ error: 'Transferencia no encontrada o no disponible.' });
        return;
      }

      res.json(transfer);
    } catch (err: any) {
      res.status(500).json({ error: 'Error al consultar la transferencia.' });
    }
  }

  /**
   * GET /api/download/:token/:fileId
   * Descarga de un archivo individual con soporte para rangos HTTP.
   */
  static downloadFile(req: Request, res: Response) {
    try {
      const token = req.params.token as string;
      const fileId = req.params.fileId as string;
      if (!token || !fileId) {
        res.status(400).json({ error: 'Parámetros incompletos.' });
        return;
      }

      const file = TransferService.getFileForDownload(token, fileId);
      if (!file) {
        res.status(404).json({ error: 'Archivo no encontrado, expirado o inaccesible.' });
        return;
      }

      const stat = fs.statSync(file.physicalPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Accept-Ranges', 'bytes');

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0] || '0', 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunksize = end - start + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunksize);

        const fileStream = fs.createReadStream(file.physicalPath, { start, end });
        fileStream.pipe(res);
      } else {
        res.setHeader('Content-Length', fileSize);
        const fileStream = fs.createReadStream(file.physicalPath);
        fileStream.pipe(res);
      }
    } catch (err: any) {
      console.error('[Download File Error]', err);
      res.status(500).json({ error: 'Error al procesar la descarga del archivo.' });
    }
  }

  /**
   * GET /api/download/:token/zip
   * Descarga conjunta de todos los archivos en un ZIP generado en streaming.
   */
  static async downloadZip(req: Request, res: Response) {
    try {
      const token = req.params.token as string;
      if (!token) {
        res.status(400).json({ error: 'Token no proporcionado.' });
        return;
      }

      const data = TransferService.getTransferForZip(token);
      if (!data || data.files.length === 0) {
        res.status(404).json({ error: 'Transferencia no encontrada o sin archivos disponibles.' });
        return;
      }

      await ZipStreamService.streamZip(data.transfer.id, data.files, res);
    } catch (err: any) {
      console.error('[Download ZIP Error]', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al generar el archivo ZIP comprimido.' });
      }
    }
  }

  /**
   * DELETE /api/manage/:token
   * Elimina una transferencia usando su token de gestión secreto.
   */
  static deleteByManagementToken(req: Request, res: Response) {
    try {
      const token = req.params.token as string;
      if (!token) {
        res.status(400).json({ error: 'Token de gestión no proporcionado.' });
        return;
      }

      const deleted = TransferService.deleteByManagementToken(token);
      if (!deleted) {
        res.status(404).json({ error: 'Transferencia no encontrada o token inválido.' });
        return;
      }

      res.json({ message: 'Transferencia eliminada exitosamente.' });
    } catch (err: any) {
      res.status(500).json({ error: 'Error al eliminar la transferencia.' });
    }
  }
}
