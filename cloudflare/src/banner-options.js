import {HttpError} from './http.js';
export function bannerOptions(b) {
  const buttonUrl = String(b.buttonUrl || '').trim();
  if (buttonUrl.length > 2000 || /[\s\\\u0000-\u001f]/.test(buttonUrl)) throw new HttpError(400, 'URL de botón no válida');
  if (buttonUrl) {
    const relative = /^\/(?!\/)/.test(buttonUrl) || /^#producto-[1-9]\d*$/.test(buttonUrl);
    let absolute = false;
    try { const u = new URL(buttonUrl); absolute = ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password; } catch {}
    if (!relative && !absolute) throw new HttpError(400, 'Usa una URL http(s), una ruta del sitio o #producto-ID');
  }
  const customImage = String(b.customImage || '');
  if (customImage && !['/img/logo.webp','/img/club-galope.webp','/img/galope-brand-banner.svg'].includes(customImage) && !/^\/uploads\/[a-f0-9]{32}\.(webp|mp4|webm)$/.test(customImage)) throw new HttpError(400, 'Imagen o video no válido');
  const mediaFit = b.mediaFit || 'contain';
  if (!['contain','cover','artwork'].includes(mediaFit)) throw new HttpError(400, 'Ajuste de imagen no válido');
  const mobileImage=String(b.mobileImage||'');
  if(mobileImage&&mobileImage!=='/img/galope-brand-banner-mobile.svg'&&!/^\/uploads\/[a-f0-9]{32}\.(webp|mp4|webm)$/.test(mobileImage))throw new HttpError(400,'Foto o video móvil no válido');
  return {buttonUrl, customImage, mobileImage, mediaFit};
}
