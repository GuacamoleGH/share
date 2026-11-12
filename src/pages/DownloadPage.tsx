import React, { useEffect, useState } from 'react';
import { Download, Archive, Clock, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { PublicTransfer } from '../types';
import { api, formatBytes } from '../services/api';
import { FileIcon } from '../components/FileIcon';

interface DownloadPageProps {
  token: string;
}

export const DownloadPage: React.FC<DownloadPageProps> = ({ token }) => {
  const [transfer, setTransfer] = useState<PublicTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchTransfer() {
      try {
        setLoading(true);
        const data = await api.getTransfer(token);
        if (mounted) {
          setTransfer(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'No se pudo cargar la transferencia.');
          setLoading(false);
        }
      }
    }

    if (token) {
      fetchTransfer();
    }
    return () => {
      mounted = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="site-container download-card-wrapper" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{ color: 'var(--color-accent-green)', fontSize: '1.2rem', fontWeight: 600 }}>
          Cargando detalles de la transferencia...
        </div>
      </div>
    );
  }

  if (error || !transfer || transfer.isExpired || transfer.status !== 'completed') {
    return (
      <div className="site-container download-card-wrapper">
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '2px solid var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-danger)',
              margin: '0 auto 20px',
            }}
          >
            <AlertTriangle size={36} />
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>
            Transferencia no disponible
          </h1>

          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto 28px', fontSize: '0.95rem' }}>
            {transfer?.isExpired
              ? 'Esta transferencia ha superado su fecha de caducidad y sus archivos han sido eliminados de forma segura.'
              : 'El enlace proporcionado no existe, es inválido o la transferencia aún no ha finalizado su subida.'}
          </p>

          <a href="/" className="btn-primary" style={{ display: 'inline-flex' }}>
            <ArrowLeft size={18} />
            <span>Ir a la página principal</span>
          </a>
        </div>
      </div>
    );
  }

  const expiryDate = new Date(transfer.expiresAt).toLocaleString();

  return (
    <div className="site-container download-card-wrapper">
      <div className="card">
        <div className="transfer-summary-box">
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              Transferencia disponible
            </h1>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span className="transfer-meta-tag">
                <CheckCircle2 size={15} style={{ color: 'var(--color-accent-green)' }} />
                {transfer.fileCount} {transfer.fileCount === 1 ? 'archivo' : 'archivos'} ({formatBytes(transfer.totalSize)})
              </span>
              <span className="transfer-meta-tag">
                <Clock size={15} style={{ color: 'var(--color-warning)' }} />
                Caduca el {expiryDate}
              </span>
            </div>
          </div>

          {transfer.files.length > 1 && (
            <a
              href={`/api/download/${encodeURIComponent(token)}/zip`}
              className="btn-primary"
              title="Descargar todos los archivos comprimidos en ZIP"
            >
              <Archive size={18} />
              <span>Descargar todo (.ZIP)</span>
            </a>
          )}
        </div>

        {/* Lista de archivos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {transfer.files.map((file) => (
            <div
              key={file.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--color-surface-input)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 18px',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                <div className="file-icon-box" style={{ width: '40px', height: '40px' }}>
                  <FileIcon fileName={file.originalName} size={22} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={file.originalName}
                  >
                    {file.originalName}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {formatBytes(file.size)}
                  </div>
                </div>
              </div>

              <a
                href={`/api/download/${encodeURIComponent(token)}/${encodeURIComponent(file.id)}`}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.88rem' }}
                title={`Descargar ${file.originalName}`}
              >
                <Download size={16} />
                <span>Descargar</span>
              </a>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--color-border-subtle)', textAlign: 'center' }}>
          <a href="/" className="btn-outline" style={{ fontSize: '0.88rem' }}>
            <ArrowLeft size={16} />
            <span>Subir tus propios archivos con GuacamoleGH Share</span>
          </a>
        </div>
      </div>
    </div>
  );
};
