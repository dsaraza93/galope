'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = process.env;
const isProd = env.NODE_ENV === 'production';
const authMode = (env.AUTH_MODE || 'google').toLowerCase(); // open | google

if (!['open', 'google'].includes(authMode)) {
  throw new Error('AUTH_MODE debe ser "open" o "google"');
}

const dataDir = path.resolve(__dirname, '..', env.DATA_DIR || 'data');

module.exports = {
  isProd,
  port: parseInt(env.PORT, 10) || 3000,
  // En modo "open" solo escucha en tu equipo. Para probar desde el celular usa HOST=0.0.0.0
  host: env.HOST || '127.0.0.1',
  trustProxy: parseInt(env.TRUST_PROXY, 10) || 0,
  authMode,
  googleClientId: env.GOOGLE_CLIENT_ID || '',
  adminEmails: (env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  sessionTtlMs: (parseInt(env.SESSION_TTL_HOURS, 10) || 12) * 3600 * 1000,
  allowedOrigins: (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  dataDir,
  uploadsDir: path.join(dataDir, 'uploads'),
  publicDir: path.resolve(__dirname, '..', 'public'),
  dbFile: path.join(dataDir, 'galope.db'),
  categories: [["Sombreros", "sombreros"], ["Botas", "botas"], ["Camisas vaqueras", "camisas"], ["Correas", "correas"], ["Cotizas", "cotizas"], ["Gorras", "gorras"], ["Ruanas y cobijas", "ruanas"], ["Accesorios", "accesorios"]],
  boldApiKey: env.BOLD_API_KEY || '',
  reservationHours: Math.min(168, Math.max(1, parseInt(env.RESERVATION_HOURS, 10) || 24)),
  orderStatuses: ['Nuevo', 'Confirmado', 'Enviado', 'Entregado', 'Cancelado'],
};
