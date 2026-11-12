import React from 'react';
import { formatBytes, formatSeconds } from '../services/api';

interface ProgressBarProps {
  percentage: number;
  uploadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  currentFileName?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  uploadedBytes,
  totalBytes,
  speedBytesPerSec,
  currentFileName,
}) => {
  const remainingBytes = Math.max(0, totalBytes - uploadedBytes);
  const remainingSeconds = speedBytesPerSec > 0 ? remainingBytes / speedBytesPerSec : 0;

  return (
    <div className="upload-progress-wrapper">
      <div className="progress-header">
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {currentFileName ? `Subiendo: ${currentFileName}` : 'Subiendo transferencia...'}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent-green)' }}>
          {Math.round(percentage)}%
        </span>
      </div>

      <div className="progress-track">
        <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }} />
      </div>

      <div className="progress-stats">
        <span>
          {formatBytes(uploadedBytes)} de {formatBytes(totalBytes)}
        </span>
        <span>
          {speedBytesPerSec > 0 ? `${formatBytes(speedBytesPerSec)}/s` : 'Iniciando...'} &middot; ETA: {formatSeconds(remainingSeconds)}
        </span>
      </div>
    </div>
  );
};
