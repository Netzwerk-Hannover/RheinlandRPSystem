export const env = (name, fallback = '') => {
  const value = process.env[name];
  return value === undefined || value === null || value.trim() === '' ? fallback : value.trim();
};

export const bool = (name, fallback = false) => {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'ja', 'on'].includes(value.trim().toLowerCase());
};

export const int = (name, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const raw = Number.parseInt(env(name, String(fallback)), 10);
  return Number.isFinite(raw) ? Math.min(max, Math.max(min, raw)) : fallback;
};

export const list = (name) => env(name).split(',').map((part) => part.trim()).filter(Boolean);
export const firstId = (name) => env(name) || null;
export const csvWords = (name) => list(name).map((item) => item.toLowerCase());

export function parseSelfRoles() {
  return env('SELFROLE_OPTIONS').split(',').map((entry) => {
    const [label, roleId] = entry.split('|').map((part) => part?.trim());
    return label && /^\d{15,22}$/.test(roleId ?? '') ? { label, roleId } : null;
  }).filter(Boolean).slice(0, 25);
}
