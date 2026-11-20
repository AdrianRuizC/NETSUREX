from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas as s
from ..db import get_db
from ..models import AdminUser
from ..ratelimit import rate_limit
from ..security import DUMMY_HASH, create_token, hash_password, require_admin, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=s.TokenOut, dependencies=[Depends(rate_limit("login", 10, 300))])
def login(data: s.LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(AdminUser).where(func.lower(AdminUser.email) == str(data.email).lower()))
    ok = verify_password(data.password, user.password_hash if user else DUMMY_HASH)
    if not (user and ok and user.is_active):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos.")
    return s.TokenOut(access_token=create_token(user), email=user.email)


@router.get("/me")
def me(user: AdminUser = Depends(require_admin)):
    return {"id": user.id, "email": user.email}


@router.post("/password", status_code=204)
def change_password(data: s.PasswordChange, user: AdminUser = Depends(require_admin), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta.")
    user.password_hash = hash_password(data.new_password)
    db.commit()
