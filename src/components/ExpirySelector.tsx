import React from 'react';

interface ExpirySelectorProps {
  selectedHours: number;
  onChange: (hours: number) => void;
  disabled?: boolean;
}

const EXPIRY_OPTIONS = [
  { hours: 24, label: '1 Día' },
  { hours: 72, label: '3 Días' },
  { hours: 168, label: '7 Días' },
  { hours: 336, label: '14 Días' },
];

export const ExpirySelector: React.FC<ExpirySelectorProps> = ({
  selectedHours,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="expiry-section">
      <label className="expiry-label">Caducidad de la transferencia</label>
      <div className="expiry-options">
        {EXPIRY_OPTIONS.map((opt) => (
          <button
            key={opt.hours}
            type="button"
            className={`expiry-btn ${selectedHours === opt.hours ? 'active' : ''}`}
            onClick={() => onChange(opt.hours)}
            disabled={disabled}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};
