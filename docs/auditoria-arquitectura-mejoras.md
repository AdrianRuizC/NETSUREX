# Auditoría Arquitectura — Mejoras Detalladas

> **Proyecto:** NetSurex  
> **Fecha:** 20 de noviembre de 2026  
> **Alcance:** Estructura del monorepo, infraestructura, despliegue  
> **Hallazgos:** 3 observaciones arquitectónicas

---

## 🟡 Observaciones Arquitectónicas

### 17. Monorepo sin gestión de dependencias compartida

**Estado actual:** `backend/` y `web/` son carpetas separadas sin herramienta de monorepo.

**Estructura:**
```
NetSurex/
├── backend/
│   ├── app/
│   ├── tests/
│   └── requirements.txt (o pyproject.toml)
├── web/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── docs/
```

**Impacto:**
- Builds independientes sin coordinación.
- No hay shared scripts para desarrollo (`npm run dev` no levanta backend + frontend).
- Las dependencias se gestionan por separado, lo cual es correcto pero limita la automatización.

**Solución:**

**Opción A — `package.json` raíz con scripts (recomendada, mínimo cambio):**

```json
// package.json (raíz del proyecto)
{
  "name": "netsurex",
  "private": true,
  "scripts": {
    "dev:backend": "cd backend && uvicorn app.main:app --reload --port 8000",
    "dev:web": "cd web && npm run dev",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:web\"",
    "build:web": "cd web && npm run build",
    "test:backend": "cd backend && pytest",
    "test": "npm run test:backend"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

**Opción B — pnpm workspaces (si se añaden paquetes compartidos en el futuro):**

```yaml
// pnpm-workspace.yaml
packages:
  - 'web'
```

```json
// package.json (raíz)
{
  "name": "netsurex-monorepo",
  "private": true
}
```

**Opción C — Turborepo (si el proyecto crece a más de 2 apps):** Solo considerar si se añaden más aplicaciones (móvil, worker, etc.).

**Recomendación:** Opción A — un `package.json` raíz con `concurrently` es suficiente para dos aplicaciones. No sobre-ingeniar la infraestructura.

---

### 18. SQLite como base de datos principal

**Estado actual:** SQLite por defecto; código preparado para PostgreSQL con `is_sqlite` checks.

**Configuración (`config.py`):**
```python
database_url: str = f"sqlite:///{BASE_DIR / 'netsurex.db'}"
```

**Código preparado para PostgreSQL (`db.py`):**
```python
def make_engine(url: str):
    is_sqlite = url.startswith("sqlite")
    engine = create_engine(url, connect_args={"check_same_thread": False} if is_sqlite else {})
    if is_sqlite:
        @event.listens_for(engine, "connect")
        def _fk_on(dbapi_conn, _):
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            cur.close()
    return engine
```

**Análisis:**

| Característica | SQLite | PostgreSQL |
|----------------|--------|------------|
| Concurrencia escritura | Limitada (1 writer) | Alta |
| Escalabilidad | Baja-Media | Alta |
| Mantenimiento | Cero | Requiere servidor |
| Migración | Manual (actual) | Alembic (recomendado) |
| JSON/Full-text | Básico | Avanzado |

**Recomendaciones por etapa:**

**Desarrollo / Baja carga (< 100 req/min):**
- SQLite es adecuado.
- Asegurar `PRAGMA journal_mode=WAL` para mejor concurrencia:

```python
# db.py — mejorar make_engine:
if is_sqlite:
    @event.listens_for(engine, "connect")
    def _sqlite_optimize(dbapi_conn, _):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.execute("PRAGMA journal_mode=WAL")      # Mejor concurrencia
        cur.execute("PRAGMA synchronous=NORMAL")     # Balance seguridad/rendimiento
        cur.close()
```

**Producción / Media carga (100-1000 req/min):**
- Migrar a PostgreSQL.
- Usar Alembic para migraciones (ver hallazgo #5 del backend).
- Variable de entorno: `NETSUREX_DATABASE_URL=postgresql+psycopg2://user:pass@host/db`

**Alta carga (> 1000 req/min):**
- PostgreSQL con connection pooling (PgBouncer).
- Considerar Redis para rate limiting distribuido.

---

### 19. Sin Docker o compose file

**Estado actual:** No hay `Dockerfile`, `docker-compose.yml`, ni configuración de nginx visible.

**Impacto:**
- Despliegue depende de instrucciones manuales.
- Dificultad para reproducir el entorno.
- Onboarding lento para nuevos desarrolladores.

**Solución completa:**

**Backend Dockerfile:**
```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Usuario no-root para seguridad
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Web Dockerfile:**
```dockerfile
# web/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Nginx config para web (`web/nginx.conf`):**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Docker Compose (desarrollo):**
```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - NETSUREX_ENVIRONMENT=development
      - NETSUREX_DATABASE_URL=sqlite:////app/netsurex.db
    volumes:
      - ./backend:/app
      - backend-uploads:/app/uploads

  web:
    build: ./web
    ports:
      - "5173:80"
    depends_on:
      - backend

volumes:
  backend-uploads:
```

**Docker Compose (producción con PostgreSQL):**
```yaml
# docker-compose.prod.yml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - NETSUREX_ENVIRONMENT=production
      - NETSUREX_DATABASE_URL=postgresql+psycopg2://netsurex:${DB_PASSWORD}@db:5432/netsurex
      - NETSUREX_SECRET_KEY=${SECRET_KEY}
      - NETSUREX_TRUST_PROXY=true
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  web:
    build: ./web
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=netsurex
      - POSTGRES_USER=netsurex
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U netsurex"]
      interval: 5s
      timeout: 3s
      retries: 3

volumes:
  pgdata:
```

**.env.example:**
```bash
# Backend
NETSUREX_ENVIRONMENT=production
NETSUREX_SECRET_KEY=change-me-in-production
NETSUREX_DATABASE_URL=postgresql+psycopg2://netsurex:password@localhost:5432/netsurex
NETSUREX_TRUST_PROXY=true
NETSUREX_CORS_ORIGINS='["https://netsurex.com"]'

# SMTP (opcional)
NETSUREX_SMTP_HOST=smtp.example.com
NETSUREX_SMTP_USER=user@example.com
NETSUREX_SMTP_PASSWORD=password
NETSUREX_SMTP_FROM=noreply@netsurex.com
NETSUREX_NOTIFY_EMAIL=admin@netsurex.com

# Database (solo compose.prod)
DB_PASSWORD=secure-password-here
```

**.dockerignore (backend):**
```
__pycache__/
*.pyc
.venv/
*.db
.secret_key
uploads/
```

**.dockerignore (web):**
```
node_modules/
dist/
.env.local
```

**Beneficios:**
- Entorno reproducible con `docker compose up`.
- Onboarding: un comando para levantar todo.
- Producción con PostgreSQL y volumes persistentes.
- Backend sirve el frontend compilado (opción `frontend_dist`).

---

## 📐 Diagrama de Arquitectura Actual

```
┌─────────────────────────────────────────────────────┐
│                    Navegador                        │
│  ┌──────────────┐  ┌──────────────┐                │
│  │  Sitio Público│  │  Panel Admin  │                │
│  │  (React SPA)  │  │  (React SPA)  │                │
│  └──────┬───────┘  └──────┬───────┘                │
│         │                 │                         │
│         │  /api/*         │  /api/admin/*           │
└─────────┼─────────────────┼─────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────┐
│              Backend (FastAPI + Uvicorn)            │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ /public/ │  │ /auth/   │  │ /admin/          │  │
│  │ (sin auth)│  │ (login)  │  │ (Bearer token)   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
│       │              │                 │            │
│       ▼              ▼                 ▼            │
│  ┌──────────────────────────────────────────────┐   │
│  │         SQLAlchemy ORM + SQLite              │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Rate Limit│  │ Mailer   │  │ File Uploads     │  │
│  │ (memory)  │  │ (SMTP)   │  │ (/uploads/)      │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## 📐 Diagrama de Arquitectura Objetivo (Producción)

```
┌─────────────────────────────────────────────────────┐
│              Nginx (Reverse Proxy + SSL)            │
│                                                     │
│  / → Frontend (SPA)                                │
│  /api/* → Backend                                  │
│  /uploads/* → Backend                              │
└──────────┬──────────────────────────┬───────────────┘
           │                          │
     ┌─────▼─────┐            ┌──────▼──────┐
     │  Frontend  │            │   Backend   │
     │  (Nginx)   │            │ (Uvicorn ×4)│
     └────────────┘            └──────┬──────┘
                                      │
                              ┌───────▼───────┐
                              │   PostgreSQL   │
                              │   (o SQLite)   │
                              └───────────────┘
                              ┌───────┐
                              │ Redis │ (rate limit)
                              └───────┘
```

---

## 📋 Checklist de Infraestructura

### Desarrollo local
- [ ] `package.json` raíz con scripts `dev`, `test`, `build`
- [ ] `docker-compose.yml` para levantar backend + web
- [ ] `.env.example` con todas las variables documentadas
- [ ] `.gitignore` actualizado (`.secret_key`, `*.db`, `node_modules/`)

### Producción
- [ ] `Dockerfile` backend y web
- [ ] `docker-compose.prod.yml` con PostgreSQL
- [ ] Nginx como reverse proxy con SSL
- [ ] Variables de entorno seguras (no en `.env` en producción)
- [ ] Backup automático de la base de datos
- [ ] Health checks configurados
- [ ] Rate limiting con Redis (si múltiples workers)

### Seguridad
- [ ] HTTPS obligatorio (Let's Encrypt / Cloudflare)
- [ ] CSP headers (ver hallazgo #11 web)
- [ ] `httpOnly` cookies para tokens (ver hallazgo #11 web)
- [ ] `.secret_key` en variable de entorno, no en disco
- [ ] Swagger deshabilitado en producción (✓ ya implementado)

---

## Resumen de prioridades

| # | Hallazgo | Prioridad | Esfuerzo | Impacto |
|---|----------|-----------|----------|---------|
| 17 | Sin gestión de monorepo | Media | Bajo | Medio |
| 18 | SQLite sin WAL optimization | Media | Bajo | Medio |
| 19 | Sin Docker / compose | Media | Alto | Alto |
