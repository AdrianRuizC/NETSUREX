import secrets
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Configuración leída de variables de entorno (prefijo NETSUREX_) o de backend/.env."""

    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", env_prefix="NETSUREX_", extra="ignore")

    environment: str = "development"  # "production" exige NETSUREX_SECRET_KEY
    database_url: str = f"sqlite:///{BASE_DIR / 'netsurex.db'}"
    secret_key: str = ""
    token_minutes: int = 12 * 60

    # Orígenes permitidos (JSON): ["https://netsurex.com"]
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"]
    # Si el backend está detrás de un proxy (nginx, etc.), usa X-Forwarded-For para identificar IPs.
    trust_proxy: bool = False

    uploads_dir: Path = BASE_DIR / "uploads"
    max_upload_mb: int = 5
    # Ruta al build del frontend (dist/) para servir todo desde un solo proceso. Vacío = no se sirve.
    frontend_dist: Path | None = None

    # Notificaciones por email de nuevas solicitudes (opcional).
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    notify_email: str = ""

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    def resolved_secret_key(self) -> str:
        if self.secret_key:
            return self.secret_key
        if self.environment == "production":
            raise RuntimeError("NETSUREX_SECRET_KEY es obligatoria en producción.")
        # En desarrollo se genera una vez y se guarda para que los tokens sobrevivan reinicios.
        key_file = BASE_DIR / ".secret_key"
        if not key_file.exists():
            key_file.write_text(secrets.token_urlsafe(48))
            key_file.chmod(0o600)
        return key_file.read_text().strip()


@lru_cache
def get_settings() -> Settings:
    return Settings()
