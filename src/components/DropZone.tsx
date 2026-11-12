import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, disabled = false }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      e.target.value = ''; // Reset para poder re-seleccionar
    }
  };

  return (
    <div
      className={`dropzone-container ${isDragOver ? 'is-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label="Arrastra y suelta archivos o haz clic para seleccionarlos"
    >
      <input
        type="file"
        ref={inputRef}
        onChange={handleInputChange}
        multiple
        className="dropzone-file-input"
        disabled={disabled}
      />

      <div className="dropzone-icon-circle">
        <UploadCloud size={32} />
      </div>

      <div className="dropzone-text-title">
        {isDragOver ? 'Suelta los archivos aquí' : 'Arrastra y suelta tus archivos aquí'}
      </div>

      <div className="dropzone-text-sub">
        o haz clic para explorar en tu dispositivo (Hasta 2 GB por archivo)
      </div>
    </div>
  );
};
