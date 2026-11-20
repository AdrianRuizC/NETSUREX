from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from .. import schemas as s
from ..db import get_db
from ..mailer import notify_new_lead
from ..quote import MAX_CAMERAS, QuoteInput, QuoteResult, estimate
from ..ratelimit import rate_limit
from ..store import get_quote, get_site

router = APIRouter(prefix="/public", tags=["público"])


def _published(db: Session, model, *order):
    q = select(model)
    if hasattr(model, "published"):
        q = q.where(model.published.is_(True))
    return db.scalars(q.order_by(*order)).all()


@router.get("/bootstrap")
def bootstrap(db: Session = Depends(get_db)):
    """Todo el contenido público del sitio en una sola llamada."""
    quote = get_quote(db)
    return {
        "site": get_site(db).model_dump(),
        "quote": {"currency": quote.currency, "maxCameras": MAX_CAMERAS},
        "order_stages": s.ORDER_STAGES,
        "divisions": [s.DivisionOut.model_validate(x) for x in _published(db, m.Division, m.Division.position)],
        "services": [s.ServiceOut.model_validate(x) for x in _published(db, m.Service, m.Service.position)],
        "plans": [s.PlanOut.model_validate(x) for x in _published(db, m.SupportPlan, m.SupportPlan.position)],
        "methodology": [
            s.MethodologyOut.model_validate(x) for x in _published(db, m.MethodologyStep, m.MethodologyStep.position)
        ],
        "projects": [s.ProjectOut.model_validate(x) for x in _published(db, m.Project, m.Project.position)],
        "posts": [s.PostOut.model_validate(x) for x in _published(db, m.BlogPost, m.BlogPost.date.desc())],
        "faqs": [s.FaqOut.model_validate(x) for x in _published(db, m.Faq, m.Faq.position)],
        "team": [s.TeamOut.model_validate(x) for x in _published(db, m.TeamMember, m.TeamMember.position)],
    }


@router.get(
    "/orders/{code}",
    response_model=s.PublicOrder,
    dependencies=[Depends(rate_limit("order-lookup", limit=20, window_seconds=60))],
)
def track_order(code: str, db: Session = Depends(get_db)):
    order = db.scalar(select(m.Order).where(m.Order.code == code.strip().upper()))
    if order is None:
        raise HTTPException(status_code=404, detail="No encontramos esa orden.")
    return s.PublicOrder(
        code=order.code,
        kind=order.kind,
        item=order.item,
        stage=order.stage,
        stages=s.ORDER_STAGES,
        note=order.public_note,
        updated=order.updated_at,
        history=[s.OrderEventOut.model_validate(e) for e in order.events],
    )


@router.post(
    "/quote/estimate",
    response_model=QuoteResult,
    dependencies=[Depends(rate_limit("quote", limit=120, window_seconds=60))],
)
def quote_estimate(data: QuoteInput, db: Session = Depends(get_db)):
    return estimate(data, get_quote(db).model_dump())


@router.post(
    "/leads",
    response_model=s.LeadCreated,
    status_code=201,
    dependencies=[Depends(rate_limit("leads", limit=5, window_seconds=60))],
)
def create_lead(data: s.LeadIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    if data.website:  # honeypot: los bots rellenan todos los campos
        raise HTTPException(status_code=400, detail="Solicitud no válida.")

    service_title = ""
    if data.service_id:
        svc = db.get(m.Service, data.service_id) or db.get(m.SupportPlan, data.service_id)
        if svc is None:
            raise HTTPException(status_code=422, detail="Servicio desconocido.")
        service_title = svc.title

    result = None
    if data.kind == "quote":
        if data.quote is None:
            raise HTTPException(status_code=422, detail="Falta el detalle de la cotización.")
        result = estimate(data.quote, get_quote(db).model_dump())
        if not service_title:
            service_title = "Cotizador CCTV" if data.quote.mode == "cctv" else "Cotizador Software"
    elif len(data.message.strip()) < 5:
        raise HTTPException(status_code=422, detail="Cuéntanos un poco más sobre tu necesidad.")

    lead = m.Lead(
        kind=data.kind,
        profile=data.profile,
        name=data.name.strip(),
        company=data.company.strip() if data.profile == "B2B" else "",
        email=str(data.email),
        phone=data.phone.strip(),
        service_id=data.service_id,
        service_title=service_title,
        message=data.message.strip() or (result.summary if result else ""),
        estimate=result.model_dump() if result else None,
        source_page=data.source_page,
    )
    db.add(lead)
    db.commit()
    background.add_task(notify_new_lead, lead)
    return s.LeadCreated(id=lead.id, estimate=result)


@router.post(
    "/leads/form",
    response_model=s.LeadCreated,
    status_code=201,
    dependencies=[Depends(rate_limit("leads", limit=5, window_seconds=60))],
)
def create_lead_from_form(
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    kind: str = Form("contact"),
    profile: str = Form("B2B"),
    name: str = Form(""),
    company: str = Form(""),
    email: str = Form(""),
    phone: str = Form(""),
    service_id: str = Form(""),
    message: str = Form(""),
    source_page: str = Form(""),
    website: str = Form(""),
):
    """La misma solicitud enviada como formulario HTML (FormData), como la envía el sitio."""
    try:
        data = s.LeadIn(
            kind=kind, profile=profile, name=name, company=company, email=email, phone=phone,
            service_id=service_id, message=message, source_page=source_page, website=website,
        )
    except ValidationError as exc:
        first = exc.errors()[0]
        raise HTTPException(status_code=422, detail=f"{'.'.join(map(str, first['loc']))}: {first['msg']}")
    return create_lead(data, background, db)
