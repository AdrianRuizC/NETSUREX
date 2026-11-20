# Auditoría NetSurex — Índice de Documentos

> **Proyecto:** NetSurex  
> **Fecha:** 20 de noviembre de 2026  
> **Alcance:** Backend (FastAPI), Frontend (React/Vite), Arquitectura

## Documentos

| Documento | Hallazgos | Enlace |
|-----------|-----------|--------|
| **Backend** | 3 críticos, 5 moderados, 7 positivos | [auditoria-backend-mejoras.md](./auditoria-backend-mejoras.md) |
| **Web** | 2 críticos, 6 moderados, 6 positivos | [auditoria-web-mejoras.md](./auditoria-web-mejoras.md) |
| **Arquitectura** | 3 observaciones | [auditoria-arquitectura-mejoras.md](./auditoria-arquitectura-mejoras.md) |

## Resumen Global

| Severidad | Cantidad | Temas |
|-----------|----------|-------|
| 🔴 Críticos | 5 | Thread en import, upload CSRF, DUMMY_HASH, SVG sanitizer, acceso DOM |
| 🟡 Moderados | 11 | Secret key, migraciones, validación, SMTP, localStorage, retry, tema, cache, clipboard, B2B, CRUD PATCH, monorepo, SQLite |
| 🟢 Positivos | 13 | scrypt, rate limiting, honeypot, sanitización, accesibilidad, lazy loading, JWT, tests |

## Prioridades Inmediatas

1. **Thread daemon en import** (`ratelimit.py`) — Mover a `create_app()`. Esfuerzo: bajo.
2. **DUMMY_HASH hardcodeado** (`security.py`) — Generar en arranque. Esfuerzo: bajo.
3. **Token en localStorage** (`api.js`) — Evaluar httpOnly cookies + CSP. Esfuerzo: alto.
4. **Fallback DOM muerto** (`Estimator.jsx`) — Eliminar código no usado. Esfuerzo: bajo.
5. **Reload para tema** (`Chrome.jsx`) — Cambiar `data-grade` dinámicamente. Esfuerzo: bajo.

## Estructura de Cada Documento

Cada documento de mejora sigue este formato:

1. **Hallazgo** — Descripción del problema con archivo y línea exacta.
2. **Problema** — Código actual que causa el hallazgo.
3. **Solución** — Una o más opciones con código de ejemplo.
4. **Recomendación** — Opción preferida con justificación.
5. **Resumen** — Tabla de prioridades con esfuerzo e impacto.
