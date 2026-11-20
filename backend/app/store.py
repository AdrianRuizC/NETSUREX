"""Acceso a la configuración guardada (tabla settings) y utilidades comunes."""

import json
import re
import secrets
import unicodedata

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import BASE_DIR
from .models import Order, SettingEntry
from .schemas import QuoteSettings, SiteSettings

SEED_FILE = BASE_DIR / "seed" / "content.json"


def _seed_settings() -> dict:
    try:
        return json.loads(SEED_FILE.read_text())["settings"]
    except (OSError, KeyError, ValueError):
        return {}


def get_site(db: Session) -> SiteSettings:
    row = db.get(SettingEntry, "site")
    data = row.value if row else _seed_settings().get("site", {})
    return SiteSettings.model_validate(data)


def get_quote(db: Session) -> QuoteSettings:
    row = db.get(SettingEntry, "quote")
    data = row.value if row else _seed_settings().get("quote", {})
    return QuoteSettings.model_validate(data)


def put_setting(db: Session, key: str, value: dict) -> None:
    row = db.get(SettingEntry, key)
    if row:
        row.value = value
    else:
        db.add(SettingEntry(key=key, value=value))
    db.commit()


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:70] or "item"


def unique_slug(db: Session, model, base: str) -> str:
    slug, n = base, 2
    while db.get(model, slug) is not None:
        slug = f"{base}-{n}"
        n += 1
    return slug


# Sin 0/O/1/I para que el código sea fácil de dictar.
_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def new_order_code(db: Session) -> str:
    while True:
        code = "NSX-" + "".join(secrets.choice(_ALPHABET) for _ in range(6))
        if db.scalar(select(Order.id).where(Order.code == code)) is None:
            return code
