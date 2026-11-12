import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Trash2, ArrowLeft } from 'lucide-react';
import { formatBytes } from '../services/api';

interface SuccessViewProps {
  publicToken: string;
  managementToken: string;
  expiresAt: string;
  totalSize: number;
  fileCount: number;
  onReset: () => void;
  onDeleteNow: (mgmtToken: string) => Promise<void>;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  publicToken,
  managementToken,
  expiresAt,
  totalSize,
  fileCount,
  onReset,
  onDeleteNow,
}) => {
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedMgmt, setCopiedMgmt] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const publicUrl = `${window.location.origin}/d/${publicToken}`;
  const expiryDate = new Date(expiresAt).toLocaleString();

  const handleCopyPublic = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2500);
    } catch {}
  };

  const handleCopyMgmt = async () => {
    try {
      await navigator.clipboard.writeText(managementToken);
      setCopiedMgmt(true);
      setTimeout(() => setCopiedMgmt(false), 2500);
    } catch {}
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Deseas eliminar permanentemente esta transferencia ahora?')) return;
    setIsDeleting(true);
    try {
      await onDeleteNow(managementToken);
      alert('Transferencia eliminada.');
      onReset();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="card success-card">
      <div className="success-badge-icon">
        <Check size={40} />
      </div>

      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
          ¡Transferencia lista!
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontSize: '0.95rem' }}>
          {fileCount} {fileCount === 1 ? 'archivo' : 'archivos'} ({formatBytes(totalSize)}) disponibles hasta el {expiryDate}
        </p>
      </div>

      {/* Enlace público */}
      <div style={{ width: '100%', textAlign: 'left' }}>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
          Enlace público de descarga
        </label>
        <div className="share-link-box">
          <input
            type="text"
            readOnly
            value={publicUrl}
            className="share-link-input"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type="button"
            onClick={handleCopyPublic}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            {copiedPublic ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedPublic ? '¡Copiado!' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* Token y acciones de gestión */}
      <div style={{ width: '100%', textAlign: 'left', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Clave de gestión (para eliminar antes de que caduque)
          </span>
          <button
            type="button"
            onClick={handleCopyMgmt}
            className="btn-outline"
            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          >
            {copiedMgmt ? 'Copiada' : 'Copiar clave'}
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
          {managementToken}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
        <a
          href={`/d/${publicToken}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ flex: 1 }}
        >
          <ExternalLink size={16} />
          <span>Abrir enlace</span>
        </a>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="btn-danger"
          style={{ padding: '10px 16px' }}
          title="Eliminar ahora"
        >
          <Trash2 size={16} />
          <span>{isDeleting ? 'Eliminando...' : 'Eliminar ahora'}</span>
        </button>
      </div>

      <div style={{ marginTop: '12px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '16px', width: '100%' }}>
        <button
          type="button"
          onClick={onReset}
          className="btn-outline"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <ArrowLeft size={16} />
          <span>Subir nueva transferencia</span>
        </button>
      </div>
    </div>
  );
};
