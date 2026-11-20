"""Comandos de administración.

    python -m app.cli seed                     # carga el contenido inicial de NetSurex (solo tablas vacías)
    python -m app.cli create-admin EMAIL       # crea un administrador (pide la contraseña)
    python -m app.cli reset-password EMAIL     # cambia la contraseña de un administrador
"""

import argparse
import getpass
import json
import os
import shutil
import sys

from sqlalchemy import func, select

from . import models as m
from .config import BASE_DIR, get_settings
from .db import SessionLocal, init_db
from .security import hash_password
from .store import SEED_FILE, put_setting

SEED_ASSETS = BASE_DIR / "seed" / "assets"


def seed() -> None:
    init_db()
    content = json.loads(SEED_FILE.read_text())
    uploads = get_settings().uploads_dir
    uploads.mkdir(parents=True, exist_ok=True)
    if SEED_ASSETS.exists():
        for asset in SEED_ASSETS.iterdir():
            if not (uploads / asset.name).exists():
                shutil.copy2(asset, uploads / asset.name)

    tables = [
        ("divisions", m.Division),
        ("services", m.Service),
        ("plans", m.SupportPlan),
        ("methodology", m.MethodologyStep),
        ("projects", m.Project),
        ("posts", m.BlogPost),
        ("faqs", m.Faq),
        ("team", m.TeamMember),
    ]
    with SessionLocal() as db:
        for key, model in tables:
            if db.scalar(select(func.count()).select_from(model)):
                print(f"  · {key}: ya tiene datos, se omite")
                continue
            for row in content[key]:
                db.add(model(**row))
            db.commit()
            print(f"  ✓ {key}: {len(content[key])} registros")
        for key, value in content["settings"].items():
            if db.get(m.SettingEntry, key) is None:
                put_setting(db, key, value)
                print(f"  ✓ ajustes '{key}'")


def _read_password() -> str:
    env = os.environ.get("NETSUREX_ADMIN_PASSWORD")
    if env:
        return env
    pw = getpass.getpass("Contraseña (mín. 10 caracteres): ")
    if pw != getpass.getpass("Repite la contraseña: "):
        sys.exit("Las contraseñas no coinciden.")
    return pw


def create_admin(email: str) -> None:
    init_db()
    with SessionLocal() as db:
        if db.scalar(select(m.AdminUser).where(func.lower(m.AdminUser.email) == email.lower())):
            sys.exit(f"Ya existe un administrador con {email}.")
        pw = _read_password()
        if len(pw) < 10:
            sys.exit("La contraseña debe tener al menos 10 caracteres.")
        db.add(m.AdminUser(email=email.lower(), password_hash=hash_password(pw)))
        db.commit()
    print(f"Administrador {email} creado.")


def reset_password(email: str) -> None:
    init_db()
    with SessionLocal() as db:
        user = db.scalar(select(m.AdminUser).where(func.lower(m.AdminUser.email) == email.lower()))
        if user is None:
            sys.exit(f"No existe el administrador {email}.")
        pw = _read_password()
        if len(pw) < 10:
            sys.exit("La contraseña debe tener al menos 10 caracteres.")
        user.password_hash = hash_password(pw)
        db.commit()
    print("Contraseña actualizada.")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("seed")
    sub.add_parser("create-admin").add_argument("email")
    sub.add_parser("reset-password").add_argument("email")
    args = parser.parse_args()
    if args.cmd == "seed":
        seed()
    elif args.cmd == "create-admin":
        create_admin(args.email)
    else:
        reset_password(args.email)


if __name__ == "__main__":
    main()
