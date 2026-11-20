import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models as m
from .. import schemas as s
from ..config import get_settings
from ..db import get_db
from ..security import require_admin
from ..store import get_quote, get_site, new_order_code, put_setting, slugify, unique_slug

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---------------------------------------------------------------- CRUD genérico


def crud(prefix: str, model, schema_in, schema_out, *, slug_field: str | None = None, order_by=None):
    """Registra list/create/get/patch/delete para un modelo de contenido."""
    r = APIRouter(prefix=f"/{prefix}", tags=[f"admin:{prefix}"])
    schema_patch = s.partial(schema_in, f"{schema_in.__name__}Patch")
    int_pk = slug_field is None

    def load(db: Session, item_id: str):
        key = item_id
        if int_pk:
            try:
                key = int(item_id)
            except ValueError:
                raise HTTPException(status_code=404, detail="No encontrado.")
        obj = db.get(model, key)
        if obj is None:
            raise HTTPException(status_code=404, detail="No encontrado.")
        return obj

    @r.get("", response_model=list[schema_out])
    def list_items(db: Session = Depends(get_db)):
        return db.scalars(select(model).order_by(order_by if order_by is not None else model.position)).all()

    @r.post("", response_model=schema_out, status_code=201)
    def create_item(data: schema_in, db: Session = Depends(get_db)):
        values = data.model_dump()
        if not int_pk:
            given = values.get("id")
            if given and db.get(model, given) is not None:
                raise HTTPException(status_code=409, detail=f"Ya existe un registro con id '{given}'.")
            values["id"] = given or unique_slug(db, model, slugify(values[slug_field]))
        else:
            values.pop("id", None)
        obj = model(**values)
        db.add(obj)
        db.commit()
        return obj

    @r.get("/{item_id}", response_model=schema_out)
    def get_item(item_id: str, db: Session = Depends(get_db)):
        return load(db, item_id)

    @r.patch("/{item_id}", response_model=schema_out)
    def update_item(item_id: str, data: schema_patch, db: Session = Depends(get_db)):
        obj = load(db, item_id)
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(obj, key, value)
        db.commit()
        return obj

    @r.delete("/{item_id}", status_code=204)
    def delete_item(item_id: str, db: Session = Depends(get_db)):
        db.delete(load(db, item_id))
        db.commit()

    router.include_router(r)


crud("divisions", m.Division, s.DivisionIn, s.DivisionOut, slug_field="name")
crud("services", m.Service, s.ServiceIn, s.ServiceOut, slug_field="title")
crud("plans", m.SupportPlan, s.PlanIn, s.PlanOut, slug_field="title")
crud("methodology", m.MethodologyStep, s.MethodologyIn, s.MethodologyOut)
crud("projects", m.Project, s.ProjectIn, s.ProjectOut, slug_field="title")
crud("posts", m.BlogPost, s.PostIn, s.PostOut, slug_field="title", order_by=m.BlogPost.date.desc())
crud("faqs", m.Faq, s.FaqIn, s.FaqOut)
crud("team", m.TeamMember, s.TeamIn, s.TeamOut, slug_field="name")


# ---------------------------------------------------------------- órdenes


def _order(db: Session, order_id: int) -> m.Order:
    order = db.get(m.Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Orden no encontrada.")
    return order


@router.get("/orders", response_model=list[s.OrderOut], tags=["admin:orders"])
def list_orders(q: str = "", db: Session = Depends(get_db)):
    stmt = select(m.Order).order_by(m.Order.updated_at.desc())
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(m.Order.code.ilike(like) | m.Order.item.ilike(like) | m.Order.customer_name.ilike(like))
    return db.scalars(stmt).all()


@router.post("/orders", response_model=s.OrderOut, status_code=201, tags=["admin:orders"])
def create_order(data: s.OrderIn, db: Session = Depends(get_db)):
    order = m.Order(code=new_order_code(db), **data.model_dump())
    order.events.append(m.OrderEvent(stage=order.stage, note=data.public_note or "Orden registrada."))
    db.add(order)
    db.commit()
    return order


@router.patch("/orders/{order_id}", response_model=s.OrderOut, tags=["admin:orders"])
def update_order(order_id: int, data: s.OrderPatch, db: Session = Depends(get_db)):
    order = _order(db, order_id)
    changes = data.model_dump(exclude_unset=True)
    stage = changes.get("stage")
    if stage is not None and not 0 <= stage < len(s.ORDER_STAGES):
        raise HTTPException(status_code=422, detail="Etapa inválida.")
    stage_changed = stage is not None and stage != order.stage
    for key, value in changes.items():
        setattr(order, key, value)
    if stage_changed:
        order.events.append(m.OrderEvent(stage=stage, note=changes.get("public_note", "")))
    order.updated_at = datetime.now(timezone.utc)
    db.commit()
    return order


@router.delete("/orders/{order_id}", status_code=204, tags=["admin:orders"])
def delete_order(order_id: int, db: Session = Depends(get_db)):
    db.delete(_order(db, order_id))
    db.commit()


# ---------------------------------------------------------------- leads


@router.get("/leads", response_model=list[s.LeadOut], tags=["admin:leads"])
def list_leads(
    status: str | None = None,
    kind: str | None = None,
    limit: int = Query(default=200, le=1000),
    db: Session = Depends(get_db),
):
    stmt = select(m.Lead).order_by(m.Lead.created_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(m.Lead.status == status)
    if kind:
        stmt = stmt.where(m.Lead.kind == kind)
    return db.scalars(stmt).all()


@router.patch("/leads/{lead_id}", response_model=s.LeadOut, tags=["admin:leads"])
def update_lead(lead_id: int, data: s.LeadPatch, db: Session = Depends(get_db)):
    lead = db.get(m.Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, key, value)
    db.commit()
    return lead


@router.delete("/leads/{lead_id}", status_code=204, tags=["admin:leads"])
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.get(m.Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada.")
    db.delete(lead)
    db.commit()


# ---------------------------------------------------------------- configuración


@router.get("/settings/site", response_model=s.SiteSettings, tags=["admin:settings"])
def read_site(db: Session = Depends(get_db)):
    return get_site(db)


@router.put("/settings/site", response_model=s.SiteSettings, tags=["admin:settings"])
def write_site(data: s.SiteSettings, db: Session = Depends(get_db)):
    put_setting(db, "site", data.model_dump())
    return data


@router.get("/settings/quote", response_model=s.QuoteSettings, tags=["admin:settings"])
def read_quote(db: Session = Depends(get_db)):
    return get_quote(db)


@router.put("/settings/quote", response_model=s.QuoteSettings, tags=["admin:settings"])
def write_quote(data: s.QuoteSettings, db: Session = Depends(get_db)):
    # Valida que la estructura sirva para calcular antes de guardarla.
    from ..quote import QuoteInput, estimate

    try:
        estimate(QuoteInput(mode="cctv", cameras=40, camera_type="ptz", cloud=True), data.model_dump())
        for key in ("landing", "corporateWeb", "ecommerce", "mobileApp", "multiplatformApp", "customSystem", "aiIntegration"):
            estimate(QuoteInput(mode="software", software_type=key), data.model_dump())
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Estructura de precios incompleta: {exc}")
    put_setting(db, "quote", data.model_dump())
    return data


# ---------------------------------------------------------------- archivos

_SIGNATURES = {
    b"\x89PNG\r\n\x1a\n": ".png",
    b"\xff\xd8\xff": ".jpg",
    b"GIF87a": ".gif",
    b"GIF89a": ".gif",
}


def _image_ext(head: bytes) -> str | None:
    for sig, ext in _SIGNATURES.items():
        if head.startswith(sig):
            return ext
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return ".webp"
    return None


@router.post("/uploads", tags=["admin:uploads"])
async def upload_image(file: UploadFile = File(...)):
    settings = get_settings()
    limit = settings.max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"La imagen supera {settings.max_upload_mb} MB.")
    ext = _image_ext(data[:16])
    if ext is None:
        raise HTTPException(status_code=415, detail="Formato no admitido. Usa PNG, JPG, GIF o WEBP.")
    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_hex(12)}{ext}"
    (settings.uploads_dir / name).write_bytes(data)
    return {"url": f"/uploads/{name}"}


# ---------------------------------------------------------------- resumen


@router.get("/stats", tags=["admin"])
def stats(db: Session = Depends(get_db)):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    count = lambda stmt: db.scalar(stmt) or 0  # noqa: E731
    return {
        "leads_new": count(select(func.count()).select_from(m.Lead).where(m.Lead.status == "nuevo")),
        "leads_week": count(select(func.count()).select_from(m.Lead).where(m.Lead.created_at >= week_ago)),
        "leads_total": count(select(func.count()).select_from(m.Lead)),
        "orders_open": count(
            select(func.count()).select_from(m.Order).where(m.Order.stage < len(s.ORDER_STAGES) - 1)
        ),
        "services": count(select(func.count()).select_from(m.Service)),
        "projects": count(select(func.count()).select_from(m.Project)),
        "posts": count(select(func.count()).select_from(m.BlogPost)),
        "order_stages": s.ORDER_STAGES,
    }
