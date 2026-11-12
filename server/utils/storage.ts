// =============================================================================
// GuacamoleGH Share — Gestión del Sistema de Archivos y Almacenamiento
// =============================================================================

import fs from 'node:fs';
import path from 'node:path';

export function getBaseStoragePath(): string {
  if (process.env.STORAGE_PATH) {
    return path.resolve(process.env.STORAGE_PATH);
  }
  return path.resolve(process.cwd(), 'storage');
}

export function getFilesStoragePath(): string {
  return path.join(getBaseStoragePath(), 'files');
}

export function getChunksStoragePath(): string {
  return path.join(getBaseStoragePath(), 'chunks');
}

export function ensureStorageDirs(): void {
  const dirs = [getBaseStoragePath(), getFilesStoragePath(), getChunksStoragePath()];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Previene vulnerabilidades de Path Traversal y caracteres inválidos en nombres de archivo.
 */
export function sanitizeOriginalFileName(filename: string): string {
  const basename = path.basename(filename);
  // Elimina caracteres de control y secuencias sospechosas
  return basename.replace(/[\0\x08\x09\x1a\n\r"\\\/]/g, '_').trim() || 'archivo';
}

/**
 * Obtiene el espacio ocupado por un directorio recursivamente.
 */
export function getDirectorySize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += getDirectorySize(fullPath);
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          total += stats.size;
        } catch {}
      }
    }
  } catch {}
  return total;
}
