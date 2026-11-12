// =============================================================================
// GuacamoleGH Share — Middleware Cloudflare Turnstile
// Valida el captcha si TURNSTILE_SECRET_KEY está configurada en .env
// =============================================================================

import { Request, Response, NextFunction } from 'express';

export async function verifyTurnstile(req: Request, res: Response, next: NextFunction): Promise<void> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Si no está configurada la clave en el homelab, permitimos el paso transparente
  if (!secretKey || secretKey.trim() === '') {
    next();
    return;
  }

  const token = req.body?.turnstileToken || req.headers['cf-turnstile-response'];

  if (!token) {
    res.status(400).json({ error: 'Falta la validación de seguridad Cloudflare Turnstile.' });
    return;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', String(token));
    formData.append('remoteip', req.ip || '');

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const outcome = await verifyRes.json() as { success: boolean };

    if (!outcome.success) {
      res.status(403).json({ error: 'Validación de Turnstile rechazada. Intente nuevamente.' });
      return;
    }

    next();
  } catch (err) {
    console.error('[Turnstile Verify Error]', err);
    res.status(500).json({ error: 'Error al verificar protección contra bots.' });
  }
}
