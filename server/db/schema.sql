-- =============================================================================
-- GuacamoleGH Share — Esquema de Base de Datos SQLite
-- =============================================================================

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  public_token_hash TEXT NOT NULL UNIQUE,
  management_token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'expired', 'deleted'
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  completed_at TEXT,
  expires_at TEXT NOT NULL,
  total_size INTEGER NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  download_count INTEGER NOT NULL DEFAULT 0,
  is_ephemeral INTEGER NOT NULL DEFAULT 0,
  last_ping TEXT
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT
);

CREATE TABLE IF NOT EXISTS upload_sessions (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  total_chunks INTEGER NOT NULL,
  received_chunks INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'assembling', 'completed', 'failed'
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS upload_chunks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT,
  received_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(session_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS download_events (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  file_id TEXT REFERENCES files(id) ON DELETE SET NULL,
  downloaded_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  status TEXT NOT NULL DEFAULT 'success'
);

-- Índices para búsqueda rápida y control de caducidad
CREATE INDEX IF NOT EXISTS idx_transfers_public_hash ON transfers(public_token_hash);
CREATE INDEX IF NOT EXISTS idx_transfers_mgmt_hash ON transfers(management_token_hash);
CREATE INDEX IF NOT EXISTS idx_transfers_expires_at ON transfers(expires_at);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_files_transfer_id ON files(transfer_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_transfer ON upload_sessions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_upload_chunks_session ON upload_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_download_events_transfer ON download_events(transfer_id);
