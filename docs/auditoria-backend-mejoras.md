# Auditoría Backend — Mejoras Detalladas

> **Proyecto:** NetSurex  
> **Fecha:** 20 de noviembre de 2026  
> **Alcance:** `backend/app/` — FastAPI, SQLite, Python  
> **Hallazgos:** 3 críticos, 5 moderados, 7 positivos

---

## 🔴 Críticos

### 1. Thread daemon se ejecuta al importar el módulo

**Archivo:** `backend/app/ratelimit.py` — línea 32  
**Riesgo:** Acumulación de hilos huérfanos en producción con reloads.

**Problema:**
```python
# Línea 32 — se ejecuta cada vez que se importa ratelimit
threading.Thread(target=_cleanup_loop, daemon=True).start()
```
Cada importación del módulo (incluido en tests, reloads de Uvicorn, o hot-reload en desarrollo) crea un nuevo hilo daemon. Con `uvicorn --reload`, cada recarga añade un hilo adicional que nunca se detiene.

**Solución:**

Mover el inicio del hilo a un punto de arranque único en `main.py`:

```python
# ratelimit.py — remover la línea 32 y añadir esta función:
def start_cleanup() -> None:
    """Inicia el hilo de limpieza una sola vez. Llamar desde create_app()."""
    threading.Thread(target=_cleanup_loop, daemon=True).start()
```

```python
# main.py — dentro de create_app(), después de init_db():
from .ratelimit import start_cleanup
start_cleanup()
```

**Alternativa más simple:** Dado que `_CLEANUP_INTERVAL` es 1 hora y los hilos son daemon (se cierran al terminar el proceso), el impacto en producción sin reload es nulo. La corrección es preventiva para desarrollo con `--reload`.

---

### 2. Upload sin protección CSRF explícita

**Archivo:** `backend/app/routers/admin.py` — líneas 230-243  
**Riesgo:** Si un token Bearer es comprometido, un atacante puede subir archivos arbitrarios.

**Problema:**
```python
@router.post("/uploads", tags=["admin:uploads"])
async def upload_image(file: UploadFile = File(...)):
    # Escribe directamente en disco sin verificación CSRF
    (settings.uploads_dir / name).write_bytes(data)
```

**Solución:**

El endpoint ya requiere autenticación Bearer (línea 15: `dependencies=[Depends(require_admin)]`). La protección CSRF adicional es defensiva. Opciones:

**Opción A — Validar Origin/Referer (recomendada):**
```python
async def upload_image(
    file: UploadFile = File(...),
    request: Request = None,
):
    # Verificar que la petición viene de un origen esperado
    origin = request.headers.get("origin", "")
    settings = get_settings()
    allowed = settings.cors_origins
    if origin and origin not in allowed:
        raise HTTPException(status_code=403, detail="Origen no autorizado.")
    # ... resto del código
```

**Opción B — Limitar MIME types adicionales:**
```python
# Antes de validar magic bytes, verificar el Content-Type
content_type = file.content_type or ""
ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}
if content_type not in ALLOWED_CONTENT_TYPES:
    # No rechazar inmediatamente (algunos clientes no envían Content-Type correcto)
    # pero registrar la advertencia
    logger.warning("Upload sin Content-Type válido: %s", content_type)
```

**Opción C — Aguarde:** La autenticación Bearer + validación de magic bytes + nombre aleatorio (`secrets.token_hex(12)`) ya mitigan significativamente el riesgo. El nombre aleatorio previene que un archivo subido sea ejecutado como script.

---

### 3. DUMMY_HASH hardcodeado

**Archivo:** `backend/app/security.py` — línea 43  
**Riesgo:** Si alguien inspecciona el código, puede usarlo para enumerar usuarios por tiempo de respuesta.

**Problema:**
```python
DUMMY_HASH = "scrypt$16384$8$1$fJkt9QIn/KNhy2U6lCmAXg==$Iea4ZIFyM2BpW0yoC/ezsDPD4cFEr5rPCClO74IHL9I="
```

**Solución:**

Generar el hash dummy en tiempo de arranque:

```python
# security.py — reemplazar la línea 43:
def _generate_dummy_hash() -> str:
    """Genera un hash scrypt válido con una contraseña imposible."""
    return hash_password("\x00" * 32 + "NETSUREX_DUMMY_" + secrets.token_hex(16))

DUMMY_HASH = _generate_dummy_hash()
```

Esto asegura que cada instancia del servidor tenga un hash diferente, imposibilitando que un atacante precalcule el tiempo de respuesta esperado.

**Nota:** El valor no es un secreto en sí mismo — su propósito es igualar tiempos, no proteger datos. Pero generar uno único por instancia elimina el riesgo de que un atacante use el valor conocido para medir diferencias de tiempo.

---

## 🟡 Moderados

### 4. Clave secreta en archivo plano

**Archivo:** `backend/app/config.py` — líneas 48-52  
**Riesgo:** En un entorno compartido, el archivo `.secret_key` expone la clave JWT.

**Problema:**
```python
key_file = BASE_DIR / ".secret_key"
if not key_file.exists():
    key_file.write_text(secrets.token_urlsafe(48))
    key_file.chmod(0o600)
return key_file.read_text().strip()
```

**Solución:**

**Opción A — Usar variable de entorno obligatoria en producción (recomendada):**
```python
def resolved_secret_key(self) -> str:
    if self.secret_key:
        return self.secret_key
    if self.environment == "production":
        raise RuntimeError(
            "NETSUREX_SECRET_KEY es obligatoria en producción. "
            "No se permite el archivo .secret_key en producción."
        )
    # Solo desarrollo
    key_file = BASE_DIR / ".secret_key"
    if not key_file.exists():
        key_file.write_text(secrets.token_urlsafe(48))
        key_file.chmod(0o600)
    return key_file.read_text().strip()
```

**Opción B — Agregar `.secret_key` a `.gitignore` (si no está ya):**
```bash
# backend/.gitignore
.secret_key
```

**Opción C — Usar un keyring del sistema en desarrollo:**
```python
import keyring
SERVICE = "netsurex"

def resolved_secret_key(self) -> str:
    if self.secret_key:
        return self.secret_key
    try:
        key = keyring.get_password(SERVICE, "secret_key")
        if key:
            return key
    except Exception:
        pass
    # Fallback al archivo (solo desarrollo)
    # ...
```

---

### 5. Migraciones manuales en lugar de Alembic

**Archivo:** `backend/app/db.py` — líneas 44-60  
**Riesgo:** Sistema frágil sin rollback ni versionado.

**Problema:**
```python
_ADDED_COLUMNS = {
    "divisions": {"image": "VARCHAR(500)"},
    "methodology_steps": {"image": "VARCHAR(500)"},
}
```

Si una columna se añade a `_ADDED_COLUMNS` pero la base ya la tiene, el código verifica `if name not in have` — lo cual es correcto. Sin embargo:
- No soporta renombrar columnas.
- No soporta cambiar tipos.
- No soporta índices.
- No hay rollback.
- No hay auditoría de qué migraciones se aplicaron.

**Solución — Migrar a Alembic:**

```bash
cd backend
pip install alembic
alembic init alembic
```

```python
# alembic.ini — ajustar sqlalchemy.url
sqlalchemy.url = sqlite:///netsurex.db
```

```python
# alembic/env.py — ajustar target_metadata
from app.db import Base
target_metadata = Base.metadata
```

```bash
# Crear la primera migración
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```

Luego, eliminar `_ADDED_COLUMNS` y `_add_missing_columns()` de `db.py`. Cada cambio futuro de modelo se versiona con:
```bash
alembic revision --autogenerate -m "add column X to table Y"
alembic upgrade head
```

**Beneficios:**
- Versionado completo de schema.
- Rollback con `alembic downgrade -1`.
- Historial de migraciones en `alembic_version`.
- Compatible con PostgreSQL sin cambios.

---

### 6. `kind`/`profile` sin validar en formulario HTML

**Archivo:** `backend/app/routers/public.py` — líneas 127-150  
**Riesgo:** Valores arbitrarios se guardan en la base de datos.

**Problema:**
```python
def create_lead_from_form(
    kind: str = Form("contact"),      # Acepta cualquier string
    profile: str = Form("B2B"),        # Acepta cualquier string
    ...
):
```

Aunque `LeadIn` schema valida `kind` como `Literal["contact", "diagnosis", "quote"]` y `profile` como `Literal["B2B", "B2C"]`, la validación ocurre en el `try/except ValidationError` (línea 142-149). Si la validación falla, se devuelve 422 — lo cual es correcto. Sin embargo, el mensaje de error expone la estructura interna del schema.

**Solución:**

```python
from typing import Literal

LEAD_KINDS = Literal["contact", "diagnosis", "quote"]
LEAD_PROFILES = Literal["B2B", "B2C"]

def create_lead_from_form(
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    kind: LEAD_KINDS = Form("contact"),      # Pydantic valida el Literal
    profile: LEAD_PROFILES = Form("B2B"),     # Pydantic valida el Literal
    ...
):
```

FastAPI con Pydantic valida automáticamente los `Literal` en `Form()`, rechazando valores no permitidos con 422 antes de entrar al cuerpo de la función.

**Nota:** Al revisar el código actual, la validación YA ocurre en `LeadIn` (línea 142-149). El riesgo es bajo: un valor inválido genera 422. La mejora es usar `Literal` directamente en `Form()` para validar antes de construir `LeadIn`.

---

### 7. `crud()` genérico expone todos los campos en PATCH

**Archivo:** `backend/app/routers/admin.py` — líneas 62-68  
**Riesgo:** Si un schema añade un campo sensible, el PATCH lo expondrá automáticamente.

**Problema:**
```python
@r.patch("/{item_id}", response_model=schema_out)
def update_item(item_id: str, data: schema_patch, db: Session = Depends(get_db)):
    obj = load(db, item_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    return obj
```

**Solución:**

**Opción A — Lista blanca de campos editables:**
```python
def crud(prefix: str, model, schema_in, schema_out, *,
         slug_field: str | None = None, order_by=None,
         patch_exclude: set[str] | None = None):
    # ...
    @r.patch("/{item_id}", response_model=schema_out)
    def update_item(item_id: str, data: schema_patch, db: Session = Depends(get_db)):
        obj = load(db, item_id)
        excluded = patch_exclude or set()
        for key, value in data.model_dump(exclude_unset=True).items():
            if key not in excluded:
                setattr(obj, key, value)
        db.commit()
        return obj
```

**Opción B — Schema PATCH dedicado por modelo:** En lugar de usar `partial()` genérico, crear schemas PATCH explícitos que excluyan campos sensibles:

```python
# schemas.py
class ServicePatch(BaseModel):
    title: str | None = None
    description: str | None = None
    # 'id' y 'division_id' no son editables vía PATCH
    position: int | None = None
    published: bool | None = None
```

**Recomendación:** La Opción A es suficiente para el alcance actual. La Opción B es más segura pero requiere más mantenimiento.

---

### 8. SMTP bloqueante en request thread

**Archivo:** `backend/app/mailer.py` — líneas 37-44  
**Riesgo:** `smtplib.SMTP` puede bloquear el event loop si se usa sin `asyncio.to_thread`.

**Problema:**
```python
with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as smtp:
    smtp.starttls()
    smtp.login(s.smtp_user, s.smtp_password)
    smtp.send_message(msg)
```

**Solución:**

**Opción A — Usar `aiosmtplib` (recomendada):**
```bash
pip install aiosmtplib
```

```python
# mailer.py
import aiosmtplib
from email.message import EmailMessage

async def notify_new_lead(lead: Lead) -> None:
    s = get_settings()
    if not (s.smtp_host and s.notify_email and s.smtp_from):
        return
    msg = _build_message(lead, s)
    try:
        async with aiosmtplib.SMTP(
            hostname=s.smtp_host,
            port=s.smtp_port,
            username=s.smtp_user or None,
            password=s.smtp_password or None,
            start_tls=True,
            timeout=15,
        ) as smtp:
            await smtp.send_message(msg)
    except Exception:
        log.exception("No se pudo enviar la notificación del lead %s", lead.id)
```

Luego, en `routers/public.py`:
```python
# BackgroundTasks ya soporta async
background.add_task(notify_new_lead, lead)  # Funciona con async
```

**Opción B — `asyncio.to_thread` (mínimo cambio):**
```python
import asyncio

def notify_new_lead(lead: Lead) -> None:
    s = get_settings()
    if not (s.smtp_host and s.notify_email and s.smtp_from):
        return
    msg = _build_message(lead, s)
    def _send():
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as smtp:
            smtp.starttls()
            if s.smtp_user:
                smtp.login(s.smtp_user, s.smtp_password)
            smtp.send_message(msg)
    # Ejecutar en thread pool para no bloquear el event loop
    asyncio.create_task(asyncio.to_thread(_send))
```

**Nota:** FastAPI's `BackgroundTasks` ejecuta las tareas en el event loop. Sin `asyncio.to_thread` o `aiosmtplib`, una conexión SMTP lenta bloquea otros requests.

---

## 🟢 Positivos (buenas prácticas detectadas)

| Práctica | Archivo | Comentario |
|----------|---------|------------|
| Password hashing con scrypt | `security.py` | Uso correcto con sal aleatoria y `hmac.compare_digest` |
| Dummy hash para timing attack | `security.py` | Patrón correcto (mejorar con hash generado en arranque) |
| Rate limiting | `ratelimit.py` | Login (10/5min), leads (5/min), quote (120/min), order (20/min) |
| Honeypot field | `routers/public.py` | Campo `website` oculto para filtrar bots |
| Validación de firma de imagen | `routers/admin.py` | Magic bytes para PNG, JPG, GIF, WEBP |
| CORS por settings | `main.py` | Orígenes explícitos desde configuración |
| Swagger deshabilitado en prod | `main.py` | `docs_url=None` cuando `environment == "production"` |
| JWT con expiración | `security.py` | Token con `exp` y verificación de `is_active` |
| Tests integrales | `tests/test_api.py` | Cubre auth, leads, órdenes, uploads, settings, rate limiting |

---

## Resumen de prioridades

| # | Hallazgo | Prioridad | Esfuerzo | Impacto |
|---|----------|-----------|----------|---------|
| 1 | Thread en import | Alta | Bajo | Medio |
| 2 | Upload CSRF | Alta | Medio | Alto |
| 3 | DUMMY_HASH | Alta | Bajo | Bajo |
| 4 | Secret key en disco | Media | Bajo | Medio |
| 5 | Migraciones manuales | Media | Alto | Alto |
| 6 | kind/profile sin Literal | Media | Bajo | Bajo |
| 7 | CRUD PATCH genérico | Media | Medio | Medio |
| 8 | SMTP bloqueante | Media | Medio | Medio |
