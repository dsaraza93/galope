'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cfg = require('./config');
const { db } = require('./db');
const { HttpError } = require('./http');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
});

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

// Firma real del archivo (no confiamos en la extensión ni en el Content-Type)
function looksLikeImage(buf) {
  if (buf.length < 12) return false;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  return jpg || png || webp;
}


function extFromName(name) {
  return path.extname(String(name || '')).toLowerCase();
}

function looksLikeVideo(buf) {
  if (buf.length < 12) return false;
  const mp4 = buf.slice(4, 8).toString() === 'ftyp';
  const webm = buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  return mp4 || webm;
}

async function saveCampaignMedia(buffer, originalName, maxEdge=1200) {
  if (looksLikeImage(buffer)) {
    const url = await saveImage(buffer,maxEdge);
    return { url, kind: 'image' };
  }
  const ext = extFromName(originalName);
  if (!['.mp4', '.webm', '.mov'].includes(ext) || !looksLikeVideo(buffer)) {
    throw new HttpError(400, 'Solo se aceptan imágenes JPG, PNG o WebP, o videos MP4, WebM o MOV');
  }
  const name = crypto.randomBytes(16).toString('hex') + ext;
  await fs.promises.writeFile(path.join(cfg.uploadsDir, name), buffer, { flag: 'wx' });
  return { url: '/uploads/' + name, kind: 'video' };
}

/** Re-codifica a WebP (quita EXIF/metadatos y cualquier carga oculta) y guarda con nombre aleatorio. */
async function saveImage(buffer,maxEdge=1200) {
  if (!looksLikeImage(buffer)) throw new HttpError(400, 'Solo se aceptan imágenes JPG, PNG o WebP');
  let sharp;
  try { sharp = require('sharp'); } catch { throw new HttpError(500, 'Falta el módulo de imágenes (sharp). Ejecuta: npm install'); }
  let out;
  try {
    out = await sharp(buffer, { limitInputPixels: 40e6 })
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new HttpError(400, 'La imagen está dañada o no es válida');
  }
  const name = crypto.randomBytes(16).toString('hex') + '.webp';
  await fs.promises.writeFile(path.join(cfg.uploadsDir, name), out, { flag: 'wx' });
  return '/uploads/' + name;
}

/** Valida que una URL de imagen sea una de las nuestras (evita enlaces externos o rutas raras). */
const IMG_RE = /^\/(uploads\/[a-f0-9]{32}|img\/[a-z]{3,20})\.webp$/;
const CAMPAIGN_MEDIA_RE = /^\/uploads\/[a-f0-9]{32}\.(webp|mp4|webm|mov)$/;
const isOurImage = (u) => typeof u === 'string' && IMG_RE.test(u);
const isOurCampaignMedia = (u, kind) => {
  if (!u) return kind === '' || kind == null;
  if (kind === 'image') return typeof u === 'string' && /\.webp$/.test(u) && CAMPAIGN_MEDIA_RE.test(u);
  if (kind === 'video') return typeof u === 'string' && /\.(mp4|webm|mov)$/.test(u) && CAMPAIGN_MEDIA_RE.test(u);
  return false;
};

/** Borra del disco las fotos subidas que ya no usa ningún producto. */
function cleanupOrphans(candidates) {
  const used = new Set();
  db.prepare("SELECT mobile_image FROM slides WHERE mobile_image<>''").all().forEach(r=>used.add(r.mobile_image));
  db.prepare("SELECT custom_image FROM slides WHERE custom_image<>''").all().forEach(r=>used.add(r.custom_image));
  const promos=db.prepare("SELECT value FROM settings WHERE key='side_promos'").get();
  if(promos)JSON.parse(promos.value).forEach(p=>{if(p.customImage)used.add(p.customImage);});
  db.prepare('SELECT imgs FROM products').all().forEach((r) => JSON.parse(r.imgs).forEach((u) => used.add(u)));
  for (const u of candidates) {
    if (!u.startsWith('/uploads/') || used.has(u) || !isOurImage(u)) continue;
    fs.promises.unlink(path.join(cfg.uploadsDir, path.basename(u))).catch(() => {});
  }
}



function cleanupCampaignMedia(candidates) {
  const used = new Set();
  db.prepare("SELECT mobile_image FROM slides WHERE mobile_image<>''").all().forEach(r=>used.add(r.mobile_image));
  db.prepare("SELECT custom_image FROM slides WHERE custom_image<>''").all().forEach(r=>used.add(r.custom_image));
  const promos=db.prepare("SELECT value FROM settings WHERE key='side_promos'").get();
  if(promos)JSON.parse(promos.value).forEach(p=>{if(p.customImage)used.add(p.customImage);});
  db.prepare("SELECT media_url FROM campaigns WHERE media_url<>''").all().forEach((r) => used.add(r.media_url));
  for (const u of candidates) {
    if (!u || !u.startsWith('/uploads/') || used.has(u) || !CAMPAIGN_MEDIA_RE.test(u)) continue;
    fs.promises.unlink(path.join(cfg.uploadsDir, path.basename(u))).catch(() => {});
  }
}

module.exports = { upload, mediaUpload, saveImage, saveCampaignMedia, isOurImage, isOurCampaignMedia, cleanupOrphans, cleanupCampaignMedia };
