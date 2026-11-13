import React from 'react';
import { Zap, Shield } from 'lucide-react';

interface ExpirySelectorProps {
  selectedHours: number;
  onChangeHours: (hours: number) => void;
  isEphemeral: boolean;
  onChangeEphemeral: (ephemeral: boolean) => void;
  disabled?: boolean;
}

const EXPIRY_OPTIONS = [
  { hours: 0.1667, label: '10 min' },
  { hours: 0.5, label: '30 min' },
  { hours: 1, label: '1 Hora' },
  { hours: 6, label: '6 Horas' },
  { hours: 24, label: '1 Día (Máx)' },
];

export const ExpirySelector: React.FC<ExpirySelectorProps> = ({
  selectedHours,
  onChangeHours,
  isEphemeral,
  onChangeEphemeral,
  disabled = false,
}) => {
  return (
    <div className="expiry-section">
      {/* Selector de modo efímero JustBeamIt */}
      <div
        onClick={() => !disabled && onChangeEphemeral(!isEphemeral)}
        style={{
          background: isEphemeral ? 'rgba(0, 245, 155, 0.08)' : 'var(--color-surface-input)',
          border: `1px solid ${isEphemeral ? 'var(--color-accent-green)' : 'var(--color-border-subtle)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '16px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          transition: 'var(--transition-fast)',
        }}
        role="button"
        tabIndex={0}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-full)',
              background: isEphemeral ? 'var(--color-accent-green)' : 'rgba(255, 255, 255, 0.05)',
              color: isEphemeral ? '#0c0e12' : 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: isEphemeral ? 'var(--color-accent-green)' : 'var(--color-text-primary)' }}>
              Transferencia en Directo
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              El archivo se destruye y elimina del servidor en cuanto cierres esta pestaña.
            </div>
          </div>
        </div>

        <div
          style={{
            width: '40px',
            height: '22px',
            borderRadius: 'var(--radius-full)',
            background: isEphemeral ? 'var(--color-accent-green)' : 'var(--color-border-subtle)',
            position: 'relative',
            transition: 'var(--transition-fast)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: 'var(--radius-full)',
              background: isEphemeral ? '#0c0e12' : 'var(--color-text-secondary)',
              position: 'absolute',
              top: '3px',
              left: isEphemeral ? '21px' : '3px',
              transition: 'var(--transition-fast)',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label className="expiry-label" style={{ marginBottom: 0 }}>
          {isEphemeral ? 'Tiempo límite de seguridad' : 'Caducidad máxima (hasta 1 día)'}
        </label>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Shield size={12} />
          Borrado automático
        </span>
      </div>

      <div className="expiry-options" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {EXPIRY_OPTIONS.map((opt) => (
          <button
            key={opt.hours}
            type="button"
            className={`expiry-btn ${selectedHours === opt.hours ? 'active' : ''}`}
            onClick={() => onChangeHours(opt.hours)}
            disabled={disabled}
            style={{ padding: '8px 4px', fontSize: '0.82rem' }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
