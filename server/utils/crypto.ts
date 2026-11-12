// =============================================================================
// GuacamoleGH Share — Utilidades Criptográficas y de Seguridad
// =============================================================================

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Genera un token aleatorio seguro para URLs públicas o gestión.
 */
export function generateToken(length = 24): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Calcula el hash SHA-256 de un token para guardarlo de forma segura en la base de datos.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Calcula el hash SHA-256 de un archivo físico en disco mediante streams (sin cargarlo en RAM).
 */
export function computeFileChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Obtiene o inicializa la clave secreta para la firma JWT.
 */
export function getJwtSecret(): string {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16) {
    return process.env.JWT_SECRET.trim();
  }

  const secretPath = path.resolve(process.cwd(), 'data', 'jwt.secret');
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, 'utf8').trim();
  }

  const dir = path.dirname(secretPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const newSecret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretPath, newSecret, { mode: 0o600 });
  return newSecret;
}

/**
 * Compara una contraseña con su hash bcrypt.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Hashea una contraseña con bcrypt.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
