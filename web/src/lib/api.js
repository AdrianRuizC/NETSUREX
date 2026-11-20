// Cliente HTTP del backend NetSurex (FastAPI).
// En desarrollo Vite redirige /api y /uploads al backend (ver vite.config.js).
// En producción, si el backend vive en otro dominio, define VITE_API_URL=https://api.tudominio.com

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'netsurex-admin-token';

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === 'string' ? detail : 'Revisa los datos ingresados.');
    this.status = status;
    this.detail = detail;
  }
}

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* sin storage */ }
  },
};

/** URL absoluta de la API (para formularios HTML que envía el kit). */
export const apiUrl = (path) => `${BASE}/api${path}`;

/** Convierte rutas de archivos subidos (/uploads/...) en URLs absolutas al backend. */
export const assetUrl = (path) => (path && path.startsWith('/uploads/') ? `${BASE}${path}` : path);

/** Mensaje legible a partir de un error de validación de FastAPI. */
const describe = (detail) => {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length) {
    const d = detail[0];
    const field = Array.isArray(d.loc) ? d.loc.filter((x) => x !== 'body').join('.') : '';
    return field ? `${field}: ${d.msg}` : d.msg;
  }
  return 'Ocurrió un error inesperado.';
};

async function request(method, path, { body, form } = {}) {
  const headers = {};
  const token = tokenStore.get();
  // El token se envía solo a /admin y /auth. Si un endpoint público requiere auth
  // en el futuro, agregar la ruta aquí o enviar el token en todas las requests
  // (el backend ignora tokens inválidos en endpoints públicos).
  if (token && (path.startsWith('/admin') || path.startsWith('/auth'))) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && path.startsWith('/admin')) {
      tokenStore.set(null);
      window.dispatchEvent(new Event('netsurex:logout'));
    }
    throw new ApiError(res.status, describe(data?.detail));
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('POST', '/admin/uploads', { form });
  },
};
