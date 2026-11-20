# NetSurex — Sitio web corporativo

**NetSurex** es una corporación tecnológica integral dirigida por su CEO, **Adrian Alejandro Ruiz Carreño**. Fundada el 4 de mayo de 2026, inicia su relanzamiento oficial con un ecosistema de soluciones para empresas (B2B) y personas (B2C).

El proyecto tiene tres carpetas:

| Parte | Tecnología | Carpeta |
| --- | --- | --- |
| Sitio público + panel `/admin` | React 18, Vite, Tailwind | `web/` |
| API y base de datos | Python, FastAPI, SQLAlchemy (SQLite por defecto) | `backend/` |
| Memoria corporativa e identidad | Markdown | `docs/` |

Todo el contenido (servicios, divisiones, pólizas, portafolio, blog, FAQ, equipo, contacto y precios del cotizador) vive en la base de datos y se edita desde **/admin**. Las solicitudes del formulario y del cotizador se guardan como **Solicitudes**, y las **Órdenes** creadas en el panel son las que tus clientes consultan con el rastreador del sitio.

## Puesta en marcha (desarrollo)

```bash
# 1. Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m app.cli seed                       # contenido inicial (solo tablas vacías)
.venv/bin/python -m app.cli create-admin tu@correo.com # pide la contraseña
.venv/bin/uvicorn app.main:app --reload --port 8000

# 2. Frontend (otra terminal)
cd web
npm install
npm run dev
```

Abre http://localhost:5173 (sitio) y http://localhost:5173/admin (panel). Vite redirige `/api` y `/uploads` al backend en el puerto 8000. La documentación interactiva de la API está en http://localhost:8000/api/docs.

Pruebas del backend:

```bash
cd backend && .venv/bin/python -m pytest
```

## Producción

1. Copia `backend/.env.example` a `backend/.env` y define como mínimo `NETSUREX_ENVIRONMENT=production`, `NETSUREX_SECRET_KEY` (aleatoria y larga) y `NETSUREX_CORS_ORIGINS` con tu dominio.
2. `cd web && npm run build` genera `web/dist/`. Puedes servirlo desde el mismo FastAPI con `NETSUREX_FRONTEND_DIST=/ruta/absoluta/dist`, o publicarlo aparte (Vercel, Netlify…) con `VITE_API_URL=https://api.tudominio.com` al compilar.
3. Ejecuta el backend con `uvicorn app.main:app --host 0.0.0.0 --port 8000` detrás de un proxy con HTTPS (nginx, Caddy). Si usas proxy, pon `NETSUREX_TRUST_PROXY=true`.
4. Opcional: configura `NETSUREX_SMTP_*` y `NETSUREX_NOTIFY_EMAIL` para recibir un email por cada nueva solicitud.

Respaldos: con SQLite basta copiar `backend/netsurex.db` y la carpeta `backend/uploads/`. Para PostgreSQL define `NETSUREX_DATABASE_URL` e instala `psycopg[binary]`.

## API (resumen)

| Público | |
| --- | --- |
| `GET /api/public/bootstrap` | Todo el contenido publicado del sitio |
| `GET /api/public/orders/{código}` | Estado de una orden (sin datos personales) |
| `POST /api/public/quote/estimate` | Cálculo del cotizador |
| `POST /api/public/leads` | Nueva solicitud (contacto, diagnóstico o cotización) |

| Admin (token Bearer de `POST /api/auth/login`) | |
| --- | --- |
| `/api/admin/{services,divisions,plans,projects,posts,faqs,team,methodology}` | CRUD de contenido |
| `/api/admin/leads`, `/api/admin/orders` | Solicitudes y órdenes |
| `/api/admin/settings/{site,quote}` | Datos de contacto, redes y precios |
| `POST /api/admin/uploads` | Subida de imágenes (PNG, JPG, GIF, WEBP; máx. 5 MB) |

Seguridad incluida: contraseñas con scrypt, JWT con expiración, límite de peticiones en login / formularios / rastreador, campo trampa anti-spam, validación de imágenes por contenido y códigos de orden aleatorios.
