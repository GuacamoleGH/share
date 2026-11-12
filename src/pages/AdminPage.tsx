import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  HardDrive,
  Layers,
  Download,
  Trash2,
  Search,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { AdminTransferItem, StorageStats } from '../types';
import { api, formatBytes } from '../services/api';

export const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Datos del panel
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [transfers, setTransfers] = useState<AdminTransferItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const ok = await api.adminCheckAuth();
    setIsAuthenticated(ok);
    if (ok) {
      loadDashboardData();
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);
      const [statsData, transfersData] = await Promise.all([
        api.adminGetStorage(),
        api.adminGetTransfers(search, statusFilter),
      ]);
      setStats(statsData);
      setTransfers(transfersData);
    } catch (err) {
      console.error('[Admin Data Error]', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await api.adminLogin(password);
      setIsAuthenticated(true);
      setPassword('');
      loadDashboardData();
    } catch (err: any) {
      setLoginError(err.message || 'Contraseña incorrecta.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await api.adminLogout();
    setIsAuthenticated(false);
    setTransfers([]);
    setStats(null);
  };

  const handleDeleteTransfer = async (id: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente la transferencia "${id}"?`)) {
      return;
    }
    try {
      await api.adminDeleteTransfer(id);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la transferencia.');
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="site-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Comprobando sesión administrativa...</p>
      </div>
    );
  }

  // Vista de Login si no está autenticado
  if (!isAuthenticated) {
    return (
      <div className="site-container" style={{ maxWidth: '420px', margin: '40px auto' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(0, 245, 155, 0.1)',
              border: '1px solid rgba(0, 245, 155, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent-green)',
              margin: '0 auto 16px',
            }}
          >
            <ShieldAlert size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
            Acceso Administrativo
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            Panel de control y gestión de GuacamoleGH Share.
          </p>

          {loginError && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.1)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.85rem',
              }}
            >
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ textAlign: 'left', marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Contraseña de Administrador
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduce la contraseña"
                className="search-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isLoggingIn ? 'Verificando...' : 'Entrar al Panel'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Vista de Dashboard
  return (
    <div className="site-container admin-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Panel de Administración</h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Monitoreo en tiempo real del almacenamiento y control de transferencias.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={loadDashboardData}
            className="btn-secondary"
            title="Refrescar datos"
          >
            <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
            <span>Refrescar</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-outline"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">
              <HardDrive size={18} style={{ color: 'var(--color-accent-green)' }} />
              <span>Espacio en Archivos</span>
            </div>
            <div className="stat-value">{formatBytes(stats.filesSizeBytes)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {stats.activeTransfersCount} transferencias activas
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <Layers size={18} style={{ color: 'var(--color-accent-turquoise)' }} />
              <span>Fragmentos Temporales</span>
            </div>
            <div className="stat-value">{formatBytes(stats.chunksSizeBytes)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              En proceso de subida
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              <Download size={18} style={{ color: 'var(--color-info)' }} />
              <span>Total Descargas</span>
            </div>
            <div className="stat-value">{stats.totalDownloads}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {stats.lifetimeTransfersCount} transferencias totales
            </div>
          </div>
        </div>
      )}

      {/* Tabla de transferencias */}
      <div className="admin-table-container">
        <div className="admin-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Search size={18} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Buscar por ID o archivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadDashboardData();
              }}
              className="search-input"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTimeout(loadDashboardData, 10);
              }}
              className="search-input"
              style={{ width: 'auto', cursor: 'pointer' }}
            >
              <option value="all">Todos los estados</option>
              <option value="completed">Completadas</option>
              <option value="pending">Pendientes</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID / Archivos</th>
                <th>Tamaño</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Caduca</th>
                <th>Descargas</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--color-text-muted)' }}>
                    No se encontraron transferencias.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => {
                  const isExpired = new Date(t.expires_at) < new Date();
                  return (
                    <tr key={t.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                          {t.files?.[0]?.original_name || 'Sin nombre'}
                          {t.file_count > 1 && ` (+${t.file_count - 1} más)`}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                          ID: {t.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{formatBytes(t.total_size)}</td>
                      <td>
                        <span
                          className="brand-badge"
                          style={{
                            background:
                              t.status === 'completed' && !isExpired
                                ? 'rgba(0, 245, 155, 0.12)'
                                : isExpired
                                ? 'rgba(244, 63, 94, 0.12)'
                                : 'rgba(245, 158, 11, 0.12)',
                            color:
                              t.status === 'completed' && !isExpired
                                ? 'var(--color-accent-green)'
                                : isExpired
                                ? 'var(--color-danger)'
                                : 'var(--color-warning)',
                            borderColor: 'transparent',
                          }}
                        >
                          {isExpired ? 'EXPIRADA' : t.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.8rem' }}>{new Date(t.expires_at).toLocaleDateString()}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{t.download_count}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransfer(t.id)}
                          className="btn-icon-danger"
                          title="Eliminar del servidor"
                          style={{ display: 'inline-flex' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
