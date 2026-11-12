import React from 'react';
import {
  FileText,
  FileArchive,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  File as GenericFile,
} from 'lucide-react';

interface FileIconProps {
  fileName: string;
  size?: number;
}

export const FileIcon: React.FC<FileIconProps> = ({ fileName, size = 20 }) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) {
    return <FileArchive size={size} />;
  }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
    return <FileImage size={size} />;
  }
  if (['mp4', 'mkv', 'avi', 'mov', 'webm', 'flv'].includes(ext)) {
    return <FileVideo size={size} />;
  }
  if (['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'].includes(ext)) {
    return <FileAudio size={size} />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'sh', 'sql', 'md'].includes(ext)) {
    return <FileCode size={size} />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'].includes(ext)) {
    return <FileText size={size} />;
  }

  return <GenericFile size={size} />;
};
