import os
import sys
import tempfile
from pathlib import Path

import pytest

_tmp = Path(tempfile.mkdtemp(prefix="netsurex-test-"))
os.environ["NETSUREX_DATABASE_URL"] = f"sqlite:///{_tmp / 'test.db'}"
os.environ["NETSUREX_UPLOADS_DIR"] = str(_tmp / "uploads")
os.environ["NETSUREX_SECRET_KEY"] = "test-secret-key-for-pytest-only-0123456789"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402

from app import cli, ratelimit  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models import AdminUser  # noqa: E402
from app.security import hash_password  # noqa: E402

ADMIN_EMAIL = "admin@netsurex.test"
ADMIN_PASSWORD = "contraseña-segura-123"


@pytest.fixture(scope="session", autouse=True)
def seeded():
    cli.seed()
    with SessionLocal() as db:
        db.add(AdminUser(email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD)))
        db.commit()


@pytest.fixture(autouse=True)
def _reset_limits():
    ratelimit.reset()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth(client):
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}
