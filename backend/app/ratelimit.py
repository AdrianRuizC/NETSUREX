import logging
import os
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from .config import get_settings

logger = logging.getLogger(__name__)

_hits: dict[tuple[str, str], deque] = defaultdict(deque)
_lock = threading.Lock()

# Limpia entradas vacías cada hora para evitar memory leak.
_CLEANUP_INTERVAL = 3600  # segundos


def _cleanup_loop() -> None:
    """Elimina periódicamente las claves vacías de _hits para evitar memory leak."""
    while True:
        time.sleep(_CLEANUP_INTERVAL)
        with _lock:
            before = len(_hits)
            _hits = {k: v for k, v in _hits.items() if v}
            removed = before - len(_hits)
            if removed:
                logger.info("Rate limit: eliminadas %d entradas vacías (%d restantes)", removed, len(_hits))


threading.Thread(target=_cleanup_loop, daemon=True).start()

# En un solo worker, el PID es la identidad del proceso.
# Con múltiples workers, cada proceso mantiene su propio contador: el rate limit
# se aplica por worker, no globalmente. Para producción con varios workers,
# usar un almacén compartido (Redis, PostgreSQL advisory locks, etc.).
_pid = os.getpid()


def _warn_once() -> None:
    """Advertencia en el arranque si se detecta un entorno multi-worker."""
    workers = os.environ.get("UVICORN_WORKERS")
    if workers and int(workers) > 1:
        logger.warning(
            "Rate limit usa almacenamiento en memoria por proceso. "
            "Con %s workers, el límite se aplica por worker, no globalmente. "
            "Para producción, considere usar Redis o un almacén compartido.",
            workers,
        )

_warn_once()


def client_ip(request: Request) -> str:
    if get_settings().trust_proxy:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, limit: int, window_seconds: int):
    """Dependencia: limita a `limit` peticiones por IP cada `window_seconds`.

    Nota: usa almacenamiento en memoria del proceso (PID %d). En entornos con
    múltiples workers de Uvicorn, el límite se aplica por worker, no globalmente.
    Para producción, migrar a un almacén compartido (Redis, PostgreSQL, etc.).
    """ % _pid

    def dependency(request: Request) -> None:
        key = (bucket, client_ip(request))
        now = time.monotonic()
        with _lock:
            q = _hits[key]
            while q and now - q[0] > window_seconds:
                q.popleft()
            if len(q) >= limit:
                raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta de nuevo en un momento.")
            q.append(now)

    return dependency


def reset() -> None:
    with _lock:
        _hits.clear()
