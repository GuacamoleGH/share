import React from 'react';
import { Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SelectedFile } from '../types';
import { formatBytes } from '../services/api';
import { FileIcon } from './FileIcon';

interface FileQueueProps {
  files: SelectedFile[];
  onRemoveFile: (id: string) => void;
  isUploading: boolean;
}

export const FileQueue: React.FC<FileQueueProps> = ({ files, onRemoveFile, isUploading }) => {
  if (files.length === 0) return null;

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="file-queue-section">
      <div className="file-queue-header">
        <span>
          Archivos seleccionados ({files.length})
        </span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          Total: {formatBytes(totalSize)}
        </span>
      </div>

      <div className="file-queue-list">
        {files.map((file) => (
          <div key={file.id} className="file-queue-item">
            <div className="file-queue-info">
              <div className="file-icon-box">
                <FileIcon fileName={file.name} size={18} />
              </div>
              <div className="file-details">
                <div className="file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="file-meta">
                  {formatBytes(file.size)}
                  {file.status === 'uploading' && ` · ${Math.round(file.progress)}%`}
                  {file.status === 'verifying' && ' · Ensamblando y verificando...'}
                  {file.status === 'completed' && ' · Listo'}
                  {file.status === 'error' && ` · Error: ${file.errorMessage || 'Fallo de subida'}`}
                </div>
              </div>
            </div>

            <div>
              {file.status === 'pending' && !isUploading && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(file.id)}
                  className="btn-icon-danger"
                  title="Quitar archivo"
                  aria-label={`Quitar archivo ${file.name}`}
                >
                  <Trash2 size={16} />
                </button>
              )}

              {file.status === 'uploading' && (
                <div style={{ color: 'var(--color-accent-green)', display: 'flex', alignItems: 'center' }}>
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}

              {file.status === 'verifying' && (
                <div style={{ color: 'var(--color-accent-turquoise)', display: 'flex', alignItems: 'center' }}>
                  <Loader2 size={16} className="animate-spin" />
                </div>
              )}

              {file.status === 'completed' && (
                <div style={{ color: 'var(--color-accent-green)', display: 'flex', alignItems: 'center' }}>
                  <CheckCircle2 size={18} />
                </div>
              )}

              {file.status === 'error' && (
                <div style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center' }} title={file.errorMessage}>
                  <AlertCircle size={18} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
