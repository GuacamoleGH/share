// =============================================================================
// GuacamoleGH Share — Servicio de Descarga en Lote ZIP (Streaming puro)
// =============================================================================

import fs from 'node:fs';
import { Response } from 'express';
import archiver from 'archiver';

export class ZipStreamService {
  /**
   * Empaqueta en tiempo real mediante streaming todos los archivos de una transferencia
   * y los envía directamente a la respuesta HTTP, sin guardar nada en disco ni en RAM.
   */
  static streamZip(transferId: string, files: Array<{ original_name: string; physicalPath: string }>, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 6 } // Balance óptimo compresión/CPU
      });

      const zipFilename = `GuacamoleGH-Transfer-${transferId.slice(0, 8)}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);

      archive.on('error', (err) => {
        reject(err);
      });

      res.on('close', () => {
        resolve();
      });

      // Conectar el archivo en streaming a la respuesta HTTP
      archive.pipe(res);

      // Añadir cada archivo físico
      for (const f of files) {
        if (fs.existsSync(f.physicalPath)) {
          archive.append(fs.createReadStream(f.physicalPath), { name: f.original_name });
        }
      }

      archive.finalize().catch(reject);
    });
  }
}
