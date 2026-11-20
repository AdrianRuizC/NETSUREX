# Auditoría Web — Mejoras Detalladas

> **Proyecto:** NetSurex  
> **Fecha:** 20 de noviembre de 2026  
> **Alcance:** `web/src/` — React, Vite, Tailwind  
> **Hallazgos:** 2 críticos, 6 moderados, 6 positivos

---

## 🔴 Críticos

### 9. `sanitizeHtml` elimina `svg` completamente

**Archivo:** `web/src/site/Pages.jsx` — líneas 14-31  
**Riesgo:** Contenido legítimo con SVGs inline se rompe silenciosamente.

**Problema:**
```javascript
const sanitizeHtml = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  // Remueve tags peligrosas (incluye svg que puede contener event handlers)
  doc.querySelectorAll('script, iframe, object, embed, form, link, style, svg')
      .forEach((el) => el.remove());
  // ...
};
```

El sanitizer es correcto desde el punto de vista de seguridad: `<svg>` puede contener `<script>`, `<animate>`, y event handlers (`onload`, `onclick`). Sin embargo, eliminar **todos** los SVGs es excesivamente restrictivo si el contenido del blog necesita iconos inline o gráficos simples.

**Solución:**

**Opción A — Permitir SVGs seguros (recomendada):**
```javascript
const sanitizeHtml = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remueve tags peligrosas (sin svg)
  doc.querySelectorAll('script, iframe, object, embed, form, link, style').forEach((el) => el.remove());

  // Para SVGs: remover event handlers y elementos animados
  doc.querySelectorAll('svg').forEach((svg) => {
    // Remover elementos de animación SVG
    svg.querySelectorAll('script, animate, animateTransform, set, mpath').forEach((el) => el.remove());
    // Remover event handlers dentro del SVG
    svg.querySelectorAll('*').forEach((el) => {
      const attrs = Array.from(el.attributes);
      attrs.forEach((attr) => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });
  });

  // Remueve atributos on* y javascript: URIs (todo el documento)
  doc.querySelectorAll('*').forEach((el) => {
    const attrs = Array.from(el.attributes);
    attrs.forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      } else if (attr.value && attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
};
```

**Opción B — Mantener el comportamiento actual (seguro pero restrictivo):** Si el contenido del blog no requiere SVGs, mantener la eliminación completa es la opción más segura y simple.

**Recomendación:** Usar la Opción A solo si el equipo necesita SVGs en el blog. De lo contrario, mantener la eliminación completa.

---

### 10. Acceso directo al DOM en `Estimator.send()`

**Archivo:** `web/src/site/Estimator.jsx` — líneas 55-58  
**Riesgo:** Viola el encapsulamiento de React; puede fallar en SSR o shadow DOM.

**Problema:**
```javascript
const send = (e) => {
  if (result) {
    const text = `${result.summary}. Rango de referencia: ${range}...`;
    if (onSend) {
      onSend(text);
    } else {
      // Fallback: accede al DOM directamente si no hay callback
      const box = document.getElementById('f-message');
      if (box) {
        box.value = text;
      } else {
        e.preventDefault();
      }
    }
  }
};
```

**Solución:**

El fallback a `document.getElementById` solo se usa cuando `onSend` no está definido. Revisando `Pages.jsx` (línea 324-326), el `Estimator` se usa **siempre** con `onSend`:

```javascript
const handleEstimateSend = (text) => {
  if (messageRef.current) messageRef.current.value = text;
};
// ...
<Estimator onSend={handleEstimateSend} />
```

Por lo tanto, el código del fallback (líneas 55-58) **nunca se ejecuta en producción**. Sin embargo, es código muerto que debería eliminarse o reemplazarse.

**Opción A — Eliminar el fallback (recomendada):**
```javascript
const send = (e) => {
  if (result && onSend) {
    const text = `${result.summary}. Rango de referencia: ${range}${result.monthly ? ` y ${formatMoney(result.monthly, result.currency)} al mes de respaldo en la nube` : ''}.`;
    onSend(text);
  }
};
```

**Opción B — Usar un custom event como fallback:**
```javascript
const send = (e) => {
  if (result) {
    const text = `${result.summary}. Rango de referencia: ${range}...`;
    if (onSend) {
      onSend(text);
    } else {
      // Fallback: emitir evento en lugar de acceder al DOM
      window.dispatchEvent(new CustomEvent('netsurex:estimate', { detail: text }));
    }
  }
};
```

**Recomendación:** Opción A — eliminar el fallback dado que `onSend` siempre se proporciona.

---

## 🟡 Moderados

### 11. Token en `localStorage`

**Archivo:** `web/src/lib/api.js` — líneas 6, 16-23  
**Riesgo:** Token JWT expuesto a ataques XSS.

**Problema:**
```javascript
const TOKEN_KEY = 'netsurex-admin-token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t) => {
    try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* sin storage */ }
  },
};
```

El token se almacena en `localStorage`, accesible desde cualquier JavaScript ejecutado en la página. Un XSS podría robar el token y autenticarse como admin.

**Solución:**

**Opción A — `httpOnly` cookies (recomendada, requiere cambios en backend):**

Backend (`security.py` — `create_token`):
```python
from fastapi.responses import JSONResponse

def create_token_response(user: AdminUser) -> JSONResponse:
    token = create_token(user)
    resp = JSONResponse(content={
        "token_type": "bearer",
        "email": user.email,
    })
    resp.set_key(
        key="netsurex_admin",
        value=token,
        httponly=True,
        secure=True,        # Solo HTTPS en producción
        samesite="lax",
        max_age=12 * 60 * 60,  # 12 horas
    )
    return resp
```

Frontend (`api.js`):
```javascript
// Eliminar tokenStore y usar cookies httpOnly
// El navegador envía la cookie automáticamente con credentials: 'include'

async function request(method, path, { body, form } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      credentials: 'include',  // Enviar cookies automáticamente
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor.');
  }
  // ...
}
```

**Opción B — Token rotación con `localStorage` (mitigación):**
```javascript
// Al recibir el token, almacenar también un timestamp de expiración
export const tokenStore = {
  get: () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const expires = localStorage.getItem(TOKEN_KEY + '_expires');
      if (token && expires && Date.now() > Number(expires)) {
        tokenStore.set(null);  // Token expirado
        return null;
      }
      return token;
    } catch { return null; }
  },
  // ...
};
```

**Opción C — CSP headers (defensa en profundidad):**
```python
# main.py — agregar middleware CSP
from starlette.middleware.base import BaseHTTPMiddleware

class CSPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "  # React necesita unsafe-inline
            "style-src 'self' 'unsafe-inline'; "   # Tailwind necesita unsafe-inline
            "img-src 'self' data: blob:; "
            "frame-ancestors 'none';"
        )
        return response

app.add_middleware(CSPMiddleware)
```

**Recomendación:** La Opción A es la más segura pero requiere cambios en backend y frontend. La Opción C es una defensa complementaria que se puede aplicar inmediatamente.

---

### 12. Token no verificado al cargar — sin retry

**Archivo:** `web/src/admin/AdminAuth.jsx` — líneas 16-20  
**Riesgo:** Si el servidor no responde al cargar, el token se limpia innecesariamente.

**Problema:**
```javascript
api
  .get('/auth/me')
  .then(setUser)
  .catch(() => tokenStore.set(null))  // Limpia el token si falla
  .finally(() => setChecking(false));
```

Si el servidor está en mantenimiento o hay una falla de red momentánea, el usuario es deslogueado automáticamente.

**Solución:**

```javascript
useEffect(() => {
  const token = tokenStore.get();
  if (!token) {
    setChecking(false);
    return;
  }

  let cancelled = false;
  const verify = async (attempt = 0) => {
    try {
      const user = await api.get('/auth/me');
      if (!cancelled) {
        setUser(user);
        setChecking(false);
      }
    } catch (e) {
      if (cancelled) return;
      // Solo limpiar si el error es 401 (token realmente inválido)
      if (e.status === 401) {
        tokenStore.set(null);
        setChecking(false);
      } else if (attempt < 2) {
        // Retry con backoff exponencial para errores de red
        setTimeout(verify, 1000 * Math.pow(2, attempt), attempt + 1);
      } else {
        // Después de 2 reintentos, mantener el token y permitir reintentar
        setChecking(false);
      }
    }
  };
  verify();

  return () => { cancelled = true; };
}, []);
```

---

### 13. `GradeToggle` hace `window.location.reload()`

**Archivo:** `web/src/site/Chrome.jsx` — líneas 54-67  
**Riesgo:** Recarga completa de la página al cambiar tema; causa flash y pierde estado.

**Problema:**
```javascript
const GradeToggle = () => {
  const light = typeof document !== 'undefined' && document.documentElement.dataset.grade === 'light';
  const flip = () => {
    try {
      localStorage.setItem('netsurex-grade', light ? 'dark' : 'light');
    } catch { /* sin almacenamiento */ }
    window.location.reload();  // Recarga completa
  };
  // ...
};
```

**Solución:**

Cambiar `data-grade` dinámicamente sin recargar:

```javascript
const GradeToggle = () => {
  const [grade, setGrade] = React.useState(
    typeof document !== 'undefined' ? document.documentElement.dataset.grade : 'dark'
  );

  React.useEffect(() => {
    // Aplicar tema guardado al montar
    const saved = localStorage.getItem('netsurex-grade');
    if (saved && saved !== grade) {
      document.documentElement.dataset.grade = saved;
      setGrade(saved);
    }
  }, []);

  const flip = () => {
    const next = grade === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.grade = next;
    setGrade(next);
    try {
      localStorage.setItem('netsurex-grade', next);
    } catch { /* sin almacenamiento */ }
  };

  return (
    <button type="button" className="grade-toggle" onClick={flip}>
      {grade === 'light' ? 'Ver en modo oscuro' : 'Ver en modo claro'}
    </button>
  );
};
```

**Beneficios:**
- Sin recarga de página.
- Sin flash de contenido.
- Estado del formulario preservado.
- Transición suave con CSS.

---

### 14. `company` required solo en B2B — backend no valida

**Archivo:** `web/src/site/Pages.jsx` — líneas 447-451  
**Riesgo:** Inconsistencia entre validación frontend y backend.

**Problema:**
```jsx
{profile === 'B2B' && (
  <div className="field">
    <label htmlFor="f-company">Empresa</label>
    <input id="f-company" name="company" type="text" required />
  </div>
)}
```

El campo `company` es `required` solo cuando `profile === 'B2B'` en el frontend. Pero el backend (`routers/public.py` línea 106) solo limpia el campo:
```python
company=data.company.strip() if data.profile == "B2B" else "",
```
No valida que `company` no esté vacío cuando `profile == "B2B"`.

**Solución:**

Backend (`routers/public.py` — `create_lead`):
```python
if data.profile == "B2B" and not data.company.strip():
    raise HTTPException(status_code=422, detail="El campo empresa es obligatorio para B2B.")
```

**Nota:** Esta validación es defensiva. El frontend ya valida con `required`, pero un atacante puede enviar directamente al backend sin pasar por el formulario.

---

### 15. `navigator.clipboard` sin fallback

**Archivo:** `web/src/admin/AdminOrders.jsx` — líneas 77-79  
**Riesgo:** Copia falla en HTTP (no HTTPS) o en iframes sin permisos.

**Problema:**
```javascript
const copy = (code) => {
  navigator.clipboard?.writeText(code);
  toast({ title: 'Código copiado', description: code });
};
```

`navigator.clipboard` solo funciona en HTTPS y puede fallar silenciosamente. El toast se muestra siempre, incluso si la copia falla.

**Solución:**

```javascript
const copy = async (code) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Código copiado', description: code });
    } else {
      // Fallback para HTTP o navegadores antiguos
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast({ title: 'Código copiado', description: code });
    }
  } catch {
    toast({
      title: 'No se pudo copiar',
      description: `Copia manualmente: ${code}`,
      variant: 'destructive',
    });
  }
};
```

---

### 16. Sin revalidation del cache en `SiteDataProvider`

**Archivo:** `web/src/site/data.jsx` — líneas 7-43  
**Riesgo:** Si el admin modifica contenido, el sitio público no refleja los cambios.

**Problema:**
```javascript
export const SiteDataProvider = ({ children }) => {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setData(await api.get('/public/bootstrap'));
  }, []);

  useEffect(() => {
    load();  // Carga una vez al montar
  }, [load]);
  // ...
};
```

**Solución:**

**Opción A — Polling periódico (simple):**
```javascript
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutos

useEffect(() => {
  load();
  const interval = setInterval(load, REFRESH_INTERVAL);
  return () => clearInterval(interval);
}, [load]);
```

**Opción B — Revalidation manual con evento:**
```javascript
// Exponer función de recarga global
useEffect(() => {
  window.netsurexRefreshData = load;
  return () => { delete window.netsurexRefreshData; };
}, [load]);

// El admin puede disparar el evento después de guardar cambios
window.dispatchEvent(new CustomEvent('netsurex:content-changed'));
```

**Opción C — Service Worker con cache stale-while-revalidate:**
```javascript
// service-worker.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/public/bootstrap')) {
    event.respondWith(
      caches.open('netsurex-api').then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        });
      })
    );
  }
});
```

**Recomendación:** Opción A para contenido que cambia frecuentemente. Opción B si el admin notifica cambios explícitamente. Opción C para producción con PWA.

---

## 🟢 Positivos (buenas prácticas detectadas)

| Práctica | Archivo | Comentario |
|----------|---------|------------|
| `dangerouslySetInnerHTML` con sanitización | `Pages.jsx` | Blog pasa por `sanitizeHtml()` antes de renderizar |
| Honeypot en formulario | `Pages.jsx` | Campo `website` oculto con `tabIndex={-1}` y `aria-hidden="true"` |
| Accesibilidad | Varios | `aria-label`, `aria-current`, `aria-live="polite"`, `aria-invalid`, skip-link |
| Lazy loading del admin | `admin/main.jsx` | Componentes cargados con `React.lazy` + `Suspense` |
| Token selectivo | `lib/api.js` | Token solo enviado a `/admin` y `/auth`, no a endpoints públicos |
| Logout automático | `lib/api.js` | Al recibir 401 en endpoints admin, se limpia el token |
| Responsive images | Varios | `srcSet`, `sizes` y `fetchpriority` en imágenes |
| Tailwind Merge + clsx | `lib/utils.js` | Evita conflictos de clases CSS |

---

## Resumen de prioridades

| # | Hallazgo | Prioridad | Esfuerzo | Impacto |
|---|----------|-----------|----------|---------|
| 9 | SVG eliminados por sanitizer | Alta | Medio | Bajo |
| 10 | Acceso directo al DOM | Alta | Bajo | Bajo |
| 11 | Token en localStorage | Alta | Alto | Alto |
| 12 | Sin retry al verificar token | Media | Bajo | Medio |
| 13 | Reload para cambio de tema | Media | Bajo | Medio |
| 14 | company B2B sin validar en backend | Media | Bajo | Bajo |
| 15 | clipboard sin fallback | Media | Bajo | Bajo |
| 16 | Sin revalidation del cache | Media | Medio | Medio |
