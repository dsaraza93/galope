
// Errores controlados + validadores mínimos (sin dependencias).
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
const bad = (msg) => new HttpError(400, msg);

const CTRL = /[\u0000-\u001f\u007f\u2028\u2029]/g;

const v = {
  str(val, name, { min = 0, max = 200, oneLine = true, required = true } = {}) {
    if (val === undefined || val === null || val === '') {
      if (required && min > 0) throw bad(`${name} es obligatorio`);
      return '';
    }
    if (typeof val !== 'string') throw bad(`${name} no es válido`);
    let s = val.normalize('NFC').trim();
    s = oneLine ? s.replace(CTRL, ' ').replace(/\s+/g, ' ') : s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
    if (s.length < min) throw bad(`${name} es muy corto`);
    if (s.length > max) throw bad(`${name} es muy largo (máx. ${max})`);
    return s;
  },
  int(val, name, { min = 0, max = 1e9 } = {}) {
    const n = typeof val === 'string' && val.trim() !== '' ? Number(val) : val;
    if (!Number.isInteger(n) || n < min || n > max) throw bad(`${name} debe ser un número entero entre ${min} y ${max}`);
    return n;
  },
  bool: (val) => val === true || val === 1 || val === 'true' || val === 'on',
  oneOf(val, list, name) {
    if (!list.includes(val)) throw bad(`${name} no es válido`);
    return val;
  },
};

const clean = (s) => String(s ?? '').replace(CTRL, ' ');

export { HttpError, bad, v, clean };
