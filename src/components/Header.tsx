import React, { useEffect, useState } from 'react';
import { Sun, Moon, ShieldCheck, UploadCloud } from 'lucide-react';

interface HeaderProps {
  currentPath?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentPath }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = (localStorage.getItem('guacamolegh-theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('guacamolegh-theme', nextTheme);
  };

  return (
    <header className="site-header">
      <div className="site-container header-content">
        <a href="/" className="brand-link" title="GuacamoleGH Share">
          <img src="/logo.png" alt="GuacamoleGH Logo" className="brand-logo-img" />
          <span className="brand-name">
            GuacamoleGH <span className="brand-product">Share</span>
          </span>
          <span className="brand-badge hide-mobile">Homelab</span>
        </a>

        <div className="header-actions">
          {currentPath === '/admin' ? (
            <a href="/" className="header-link" title="Subir Archivos" aria-label="Subir Archivos">
              <UploadCloud size={16} />
              <span className="header-link-text">Subir</span>
            </a>
          ) : (
            <a href="/admin" className="header-link" title="Administración" aria-label="Administración">
              <ShieldCheck size={16} />
              <span className="header-link-text">Admin</span>
            </a>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};
