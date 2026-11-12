// =============================================================================
// GuacamoleGH Share — Tipos e Interfaces TypeScript
// =============================================================================

export interface SelectedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'verifying' | 'completed' | 'error';
  errorMessage?: string;
  speedBytesPerSec?: number;
}

export interface TransferFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum?: string;
}

export interface PublicTransfer {
  id: string;
  status: 'pending' | 'completed' | 'expired' | 'deleted';
  createdAt: string;
  completedAt?: string;
  expiresAt: string;
  totalSize: number;
  fileCount: number;
  downloadCount: number;
  isExpired: boolean;
  files: TransferFile[];
}

export interface CreateTransferResponse {
  transferId: string;
  publicToken: string;
  managementToken: string;
  expiresAt: string;
  totalSize: number;
  fileCount: number;
  files: Array<{
    id: string;
    originalName: string;
    mimeType: string;
    size: number;
  }>;
}

export interface StorageStats {
  filesSizeBytes: number;
  chunksSizeBytes: number;
  totalStorageUsedBytes: number;
  activeTransfersCount: number;
  activeTransfersSize: number;
  totalDownloads: number;
  lifetimeTransfersCount: number;
}

export interface AdminTransferItem {
  id: string;
  status: string;
  created_at: string;
  completed_at?: string;
  expires_at: string;
  total_size: number;
  file_count: number;
  download_count: number;
  files: Array<{
    id: string;
    original_name: string;
    size: number;
    mime_type: string;
    checksum?: string;
  }>;
}
