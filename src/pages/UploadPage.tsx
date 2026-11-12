import React, { useState, useRef } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { DropZone } from '../components/DropZone';
import { FileQueue } from '../components/FileQueue';
import { ExpirySelector } from '../components/ExpirySelector';
import { ProgressBar } from '../components/ProgressBar';
import { SuccessView } from '../components/SuccessView';
import { SelectedFile, CreateTransferResponse } from '../types';
import { api, uploadFileChunks, MAX_FILE_SIZE, MAX_TRANSFER_SIZE, formatBytes } from '../services/api';

export const UploadPage: React.FC = () => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [expiryHours, setExpiryHours] = useState<number>(24);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [uploadedBytes, setUploadedBytes] = useState<number>(0);
  const [totalTransferBytes, setTotalTransferBytes] = useState<number>(0);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedTransfer, setCompletedTransfer] = useState<CreateTransferResponse | null>(null);

  // Control de velocidad
  const lastTimeRef = useRef<number>(Date.now());
  const lastBytesRef = useRef<number>(0);

  const handleFilesSelected = (newFiles: File[]) => {
    setErrorMessage(null);
    const existingNames = new Set(files.map((f) => f.name));

    const formatted: SelectedFile[] = [];
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`"${file.name}" supera el límite individual de 2 GB.`);
        continue;
      }
      if (!existingNames.has(file.name)) {
        formatted.push({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          progress: 0,
          status: 'pending',
        });
      }
    }

    const merged = [...files, ...formatted];
    const totalSize = merged.reduce((acc, f) => acc + f.size, 0);

    if (totalSize > MAX_TRANSFER_SIZE) {
      setErrorMessage(`El total acumulado supera el límite de transferencia de ${formatBytes(MAX_TRANSFER_SIZE)}.`);
      return;
    }

    setFiles(merged);
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStartUpload = async () => {
    if (files.length === 0 || isUploading) return;
    setErrorMessage(null);
    setIsUploading(true);

    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    setTotalTransferBytes(totalBytes);
    setUploadedBytes(0);
    setOverallProgress(0);

    lastTimeRef.current = Date.now();
    lastBytesRef.current = 0;

    try {
      // 1. Crear registro de transferencia en backend
      const initPayload = {
        expiryHours,
        files: files.map((f) => ({
          originalName: f.name,
          mimeType: f.type,
          size: f.size,
        })),
      };

      const transferMeta = await api.createTransfer(expiryHours, initPayload.files);

      // Mapa para asociar archivo local con el fileId retornado por backend
      const fileIdMap = new Map<string, string>();
      transferMeta.files.forEach((f) => {
        fileIdMap.set(f.originalName, f.id);
      });

      // 2. Subir cada archivo por chunks
      let accumulatedUploaded = 0;

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        if (!item) continue;
        const fileId = fileIdMap.get(item.name);
        if (!fileId) throw new Error(`No se encontró el identificador asignado para ${item.name}`);

        setCurrentFileName(item.name);
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading' } : f))
        );

        let previousFileBytes = 0;

        await uploadFileChunks(
          item.file,
          transferMeta.transferId,
          fileId,
          (fileBytesUploaded) => {
            const delta = fileBytesUploaded - previousFileBytes;
            previousFileBytes = fileBytesUploaded;
            accumulatedUploaded += delta;

            const now = Date.now();
            const elapsedSec = (now - lastTimeRef.current) / 1000;
            if (elapsedSec >= 0.5) {
              const speed = (accumulatedUploaded - lastBytesRef.current) / elapsedSec;
              setCurrentSpeed(speed);
              lastTimeRef.current = now;
              lastBytesRef.current = accumulatedUploaded;
            }

            const pct = Math.min(100, (fileBytesUploaded / item.size) * 100);
            const globalPct = Math.min(100, (accumulatedUploaded / totalBytes) * 100);

            setUploadedBytes(accumulatedUploaded);
            setOverallProgress(globalPct);
            setFiles((prev) =>
              prev.map((f) => (f.id === item.id ? { ...f, progress: pct } : f))
            );
          }
        );

        // Marcar archivo como completado
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: 'completed', progress: 100 } : f))
        );
      }

      // 3. Todo completado
      setIsUploading(false);
      setCompletedTransfer(transferMeta);
    } catch (err: any) {
      console.error('[Upload Error]', err);
      setIsUploading(false);
      setErrorMessage(err.message || 'Ocurrió un error inesperado durante la subida.');
    }
  };

  const handleReset = () => {
    setFiles([]);
    setCompletedTransfer(null);
    setOverallProgress(0);
    setUploadedBytes(0);
    setErrorMessage(null);
  };

  if (completedTransfer) {
    return (
      <div className="site-container upload-card-wrapper">
        <SuccessView
          publicToken={completedTransfer.publicToken}
          managementToken={completedTransfer.managementToken}
          expiresAt={completedTransfer.expiresAt}
          totalSize={completedTransfer.totalSize}
          fileCount={completedTransfer.fileCount}
          onReset={handleReset}
          onDeleteNow={async (token) => {
            await api.deleteByManagementToken(token);
          }}
        />
      </div>
    );
  }

  return (
    <div className="site-container upload-card-wrapper">
      <div className="hero-section">
        <h1 className="hero-title">
          Transferencia rápida y privada <span className="gradient-text">sin límites</span>
        </h1>
        <p className="hero-subtitle">
          Sube y comparte archivos de hasta 2 GB con cifrado de enlace y borrado automático en tu homelab.
        </p>
      </div>

      <div className="card">
        {errorMessage && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid var(--color-danger)',
              color: 'var(--color-danger)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <DropZone onFilesSelected={handleFilesSelected} disabled={isUploading} />

        <FileQueue files={files} onRemoveFile={handleRemoveFile} isUploading={isUploading} />

        {files.length > 0 && !isUploading && (
          <ExpirySelector selectedHours={expiryHours} onChange={setExpiryHours} />
        )}

        {isUploading && (
          <ProgressBar
            percentage={overallProgress}
            uploadedBytes={uploadedBytes}
            totalBytes={totalTransferBytes}
            speedBytesPerSec={currentSpeed}
            currentFileName={currentFileName}
          />
        )}

        {files.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <button
              type="button"
              onClick={handleStartUpload}
              disabled={isUploading || files.length === 0}
              className="btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '14px' }}
            >
              <UploadCloud size={20} />
              <span>{isUploading ? 'Subiendo archivos...' : 'Iniciar transferencia'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
