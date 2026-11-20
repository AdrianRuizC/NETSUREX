from collections.abc import Iterator

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


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


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Columnas añadidas después de la primera versión: se agregan solas a una base existente.
# Para agregar una nueva columna:
#   1. Añadir el campo al modelo SQLAlchemy en models.py
#   2. Agregar la entrada aquí con el tipo DDL de SQLite/PostgreSQL
#   3. La columna se crea automáticamente al iniciar el servidor
# Nota: para cambios más complejos (renombrar columnas, cambiar tipos, índices),
# considerar migrar a Alembic: https://alembic.sqlalchemy.org/
_ADDED_COLUMNS = {
    "divisions": {"image": "VARCHAR(500)"},
    "methodology_steps": {"image": "VARCHAR(500)"},
}


def _add_missing_columns() -> None:
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, cols in _ADDED_COLUMNS.items():
            if not insp.has_table(table):
                continue
            have = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in cols.items():
                if name not in have:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))


def init_db() -> None:
    from . import models  # noqa: F401  (registra las tablas)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()
