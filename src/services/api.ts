// =============================================================================
// GuacamoleGH Share — Cliente API y Motor de Subida Fragmentada
// =============================================================================

import {
  CreateTransferResponse,
  PublicTransfer,
  StorageStats,
  AdminTransferItem,
} from '../types';

export const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
export const MAX_TRANSFER_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB por fragmento
const MAX_CONCURRENT_CHUNKS = 2; // Concurrencia controlada
const MAX_RETRIES = 3;

/**
 * Formatea bytes en unidades legibles (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Formatea segundos en tiempo restante legible.
 */
export function formatSeconds(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return 'Calculando...';
  if (seconds < 60) return `${Math.ceil(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

export const api = {
  async createTransfer(
    expiryHours: number,
    files: Array<{ originalName: string; mimeType: string; size: number }>,
    isEphemeral = false
  ): Promise<CreateTransferResponse> {
    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiryHours, files, isEphemeral }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al iniciar la transferencia.');
    return data;
  },

  async pingEphemeral(managementToken: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/manage/${encodeURIComponent(managementToken)}/ping`, {
        method: 'POST',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getTransfer(token: string): Promise<PublicTransfer> {
    const res = await fetch(`/api/transfers/${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Transferencia no encontrada.');
    return data;
  },

  async deleteByManagementToken(token: string): Promise<void> {
    const res = await fetch(`/api/manage/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar la transferencia.');
  },

  async adminLogin(password: string): Promise<void> {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Contraseña incorrecta.');
  },

  async adminLogout(): Promise<void> {
    await fetch('/api/admin/logout', { method: 'POST' });
  },

  async adminCheckAuth(): Promise<boolean> {
    try {
      const res = await fetch('/api/admin/check');
      return res.ok;
    } catch {
      return false;
    }
  },

  async adminGetTransfers(search?: string, status?: string): Promise<AdminTransferItem[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);

    const res = await fetch(`/api/admin/transfers?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al obtener transferencias.');
    return data;
  },

  async adminDeleteTransfer(id: string): Promise<void> {
    const res = await fetch(`/api/admin/transfers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al eliminar la transferencia.');
  },

  async adminGetStorage(): Promise<StorageStats> {
    const res = await fetch('/api/admin/storage');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al obtener estadísticas.');
    return data;
  },
};

/**
 * Motor de subida de un archivo individual mediante fragmentos (chunks) concurrentes con reintentos.
 */
export async function uploadFileChunks(
  file: File,
  transferId: string,
  fileId: string,
  onProgress: (bytesUploaded: number, totalBytes: number) => void
): Promise<void> {
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE) || 1;

  // 1. Inicializar sesión de subida
  const initRes = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transferId,
      fileId,
      totalChunks,
    }),
  });

  const initData = await initRes.json();
  if (!initRes.ok) {
    throw new Error(initData.error || 'No se pudo iniciar la sesión de subida.');
  }

  const sessionId = initData.sessionId;

  // 2. Control de subida de fragmentos con concurrencia limitada
  const uploadedBytesMap = new Map<number, number>();

  let activeIndex = 0;
  let hasError: Error | null = null;

  async function uploadSingleChunk(chunkIndex: number, attempt = 1): Promise<void> {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunkBlob = file.slice(start, end);
    const chunkBuffer = await chunkBlob.arrayBuffer();

    try {
      const res = await fetch(`/api/uploads/${encodeURIComponent(sessionId)}/chunks/${chunkIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: chunkBuffer,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Error al subir fragmento ${chunkIndex}`);
      }

      uploadedBytesMap.set(chunkIndex, end - start);

      // Calcular progreso acumulado
      let currentTotalUploaded = 0;
      for (const bytes of uploadedBytesMap.values()) {
        currentTotalUploaded += bytes;
      }
      onProgress(currentTotalUploaded, totalSize);
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        // Retroceso exponencial antes de reintentar
        await new Promise((r) => setTimeout(r, attempt * 1000));
        return uploadSingleChunk(chunkIndex, attempt + 1);
      }
      throw err;
    }
  }

  // Cola de concurrencia
  const workers = Array.from({ length: Math.min(MAX_CONCURRENT_CHUNKS, totalChunks) }, async () => {
    while (activeIndex < totalChunks && !hasError) {
      const currentIndex = activeIndex++;
      try {
        await uploadSingleChunk(currentIndex);
      } catch (err: any) {
        hasError = err;
        break;
      }
    }
  });

  await Promise.all(workers);

  if (hasError) {
    throw hasError;
  }

  // 3. Completar y ensamblar fragmentos en el servidor
  const completeRes = await fetch(`/api/uploads/${encodeURIComponent(sessionId)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const completeData = await completeRes.json();
  if (!completeRes.ok) {
    throw new Error(completeData.error || 'Error al ensamblar el archivo final en el servidor.');
  }
}
