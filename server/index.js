'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cfg = require('./config');
require('./db');
const { expireReservations } = require('./reservations');
expireReservations();
const reservationSweep = setInterval(() => { try { expireReservations(); } catch(e) { console.error('[reservas]',e); } }, 60 * 1000);
// Mantener el ciclo de vida del proceso activo junto al servidor HTTP.
// En determinados entornos Windows, liberar todos los timers puede permitir
// una terminación limpia prematura sin mostrar un error.
// No llamar unref() en este timer: también garantiza barrido de reservas.

const auth = require('./auth');
const { HttpError } = require('./http');

/* ---------- Seguridad de arranque ---------- */
if (cfg.authMode === 'open') {
  if (cfg.isProd) {
    console.error('\n✖ AUTH_MODE=open no está permitido en producción: cualquiera podría administrar la tienda.');
    console.error('  Configura AUTH_MODE=google (ver CONFIGURAR_GOOGLE_ADMIN.md).\n');
    process.exit(1);
  }
  console.warn('\n⚠  PANEL DE ADMINISTRACIÓN SIN CONTRASEÑA (AUTH_MODE=open). Úsalo solo para pruebas.\n');
}
if (cfg.authMode === 'google' && (!cfg.googleClientId || !cfg.adminEmails.length)) {
  console.error('✖ AUTH_MODE=google requiere GOOGLE_CLIENT_ID y ADMIN_EMAILS en el archivo .env');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
if (cfg.trustProxy) app.set('trust proxy', cfg.trustProxy);

/* ---------- Cabeceras HTTP (CSP estricta: sin scripts inline) ---------- */
const g = cfg.authMode === 'google';
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.bold.co', 'https://s3.amazonaws.com', ...(g ? ['https://accounts.google.com/gsi/client'] : [])],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', ...(g ? ['https://accounts.google.com/gsi/style'] : [])],
      fontSrc: ['https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://*.addi.com', 'https://*.amazonaws.com'],
      connectSrc: ["'self'", 'https://checkout.bold.co', 'https://*.bold.co', 'https://*.addi.com', 'https://*.amazonaws.com', ...(g ? ['https://accounts.google.com/gsi/'] : [])],
      frameSrc: ['https://checkout.bold.co', 'https://*.addi.com', ...(g ? ['https://accounts.google.com/gsi/'] : [])],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      ...(cfg.isProd ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // necesario para el popup de Google
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: cfg.isProd,
}));
app.use(compression());

/* ---------- Límite global y cuerpo JSON pequeño ---------- */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
}));
// Webhook Bold: captura los bytes originales ANTES del parser JSON y del anti-CSRF.
// La autenticación de esta ruta es la firma HMAC de Bold, no una cookie del navegador.
app.use('/api/bold/webhook', express.raw({ type: 'application/json', limit: '64kb' }), require('./routes/bold-webhook'));
app.use('/api', express.json({ limit: '50kb' }));

/* ---------- Anti-CSRF para cualquier petición que modifique datos ---------- */
// Las cookies son SameSite=Lax; además exigimos un encabezado propio (un sitio ajeno no puede
// enviarlo sin permiso CORS, que aquí no existe) y que el Origin, si viene, sea el mismo sitio.
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'galope') return next(new HttpError(403, 'Solicitud no permitida'));
  const origin = req.get('origin');
  if (origin) {
    let ok = cfg.allowedOrigins.includes(origin);
    try { ok = ok || new URL(origin).host === req.get('host'); } catch { ok = false; }
    if (!ok) return next(new HttpError(403, 'Origen no permitido'));
  }
  next();
});

/* ---------- API ---------- */
app.use('/api', require('./routes/public'));
app.use('/api', require('./routes/bold'));
app.use('/api', require('./routes/addi')); // Consulta pública de elegibilidad; NO inicia financiación



app.get('/api/auth/status', (req, res) => { res.set('Cache-Control', 'no-store'); res.json(auth.status(req)); });
app.post('/api/auth/google',
  rateLimit({ windowMs: 15 * 60 * 1000, max: 15, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos de acceso.' } }),
  async (req, res) => res.json(await auth.loginWithGoogle((req.body || {}).credential, req, res)));
app.post('/api/auth/logout', (req, res) => { auth.logout(req, res); res.json({ ok: true }); });

app.use('/api/admin', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); },
  auth.requireAdmin, require('./routes/admin'));
app.use('/api', (req, res, next) => next(new HttpError(404, 'No encontrado')));

/* ---------- Archivos estáticos ---------- */
app.use('/uploads', express.static(cfg.uploadsDir, {
  index: false, dotfiles: 'deny', maxAge: '30d', immutable: true,
  setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
}));
app.use(express.static(cfg.publicDir, { dotfiles: 'deny', maxAge: cfg.isProd ? '1h' : 0 }));

/* ---------- Errores ---------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') err = new HttpError(413, 'Solicitud demasiado grande');
  if (err.type === 'entity.parse.failed') err = new HttpError(400, 'JSON no válido');
  if (err.code === 'LIMIT_FILE_SIZE') err = new HttpError(413, 'La imagen pesa más de 6 MB');
  if (err.name === 'MulterError') err = new HttpError(400, 'Archivo no válido');
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: status >= 500 ? 'Error interno del servidor' : err.message, details: err.details });
});

const httpServer = app.listen(cfg.port, cfg.host, () => {
  const where = cfg.host === '0.0.0.0' ? 'todas las interfaces' : cfg.host;
  console.log(`✔ Galope en http://${cfg.host === '0.0.0.0' ? 'localhost' : cfg.host}:${cfg.port}  (${where})`);
  console.log(`  Panel: http://localhost:${cfg.port}/#admin   · Acceso admin: ${cfg.authMode === 'open' ? 'ABIERTO (pruebas)' : 'Google'}`);
});

// Registrar fallos del listener y diagnosticar cierres inesperados.
httpServer.on('error', err => { console.error('[HTTP ERROR]', err); process.exitCode = 1; });
httpServer.on('close', () => console.error('[HTTP CLOSED] El servidor HTTP dejó de escuchar.'));
