import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { UploadPage } from './pages/UploadPage';
import { DownloadPage } from './pages/DownloadPage';
import { AdminPage } from './pages/AdminPage';
import './styles/main.css';

export const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const renderCurrentView = () => {
    // Ruta de descarga: /d/:token
    if (currentPath.startsWith('/d/')) {
      const token = currentPath.replace('/d/', '').split('/')[0] || '';
      return <DownloadPage token={token} />;
    }

    // Ruta de administración: /admin
    if (currentPath.startsWith('/admin')) {
      return <AdminPage />;
    }

    // Por defecto: subida de archivos
    return <UploadPage />;
  };

  return (
    <div className="site-wrapper">
      <Header currentPath={currentPath} />
      <main className="main-content">
        {renderCurrentView()}
      </main>
      <Footer />
    </div>
  );
};
