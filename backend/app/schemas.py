from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, create_model

from .quote import QuoteInput, QuoteResult

Audience = Literal["B2B", "B2C", "Ambos"]
Slug = Field(default=None, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=80)


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


def partial(model: type[BaseModel], name: str) -> type[BaseModel]:
    """Crea una variante con todos los campos opcionales (para PATCH)."""
    fields = {k: (Optional[f.annotation], None) for k, f in model.model_fields.items() if k != "id"}
    return create_model(name, __base__=BaseModel, **fields)


# ---------------------------------------------------------------- contenido


class DivisionIn(BaseModel):
    id: str | None = Slug
    name: str = Field(min_length=1, max_length=120)
    icon_name: str = "ShieldCheck"
    summary: str = ""
    image: str | None = None
    position: int = 0


class DivisionOut(DivisionIn, ORM):
    id: str


class ServiceIn(BaseModel):
    id: str | None = Slug
    division_id: str
    audience: Audience = "Ambos"
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    icon_name: str = "ShieldCheck"
    tags: list[str] = []
    position: int = 0
    published: bool = True


class ServiceOut(ServiceIn, ORM):
    id: str


class PlanIn(BaseModel):
    id: str | None = Slug
    audience: Audience = "Ambos"
    title: str = Field(min_length=1, max_length=200)
    icon_name: str = "ShieldCheck"
    description: str = ""
    features: list[str] = []
    highlighted: bool = False
    position: int = 0
    published: bool = True


class PlanOut(PlanIn, ORM):
    id: str


class MethodologyIn(BaseModel):
    step: str = Field(min_length=1, max_length=10)
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    icon_name: str = "ShieldCheck"
    image: str | None = None
    position: int = 0


class MethodologyOut(MethodologyIn, ORM):
    id: int


class ProjectIn(BaseModel):
    id: str | None = Slug
    title: str = Field(min_length=1, max_length=200)
    type: str = "Software"
    division_id: str | None = None
    short_description: str = ""
    image: str | None = None
    tags: list[str] = []
    challenge: str = ""
    solution: str = ""
    key_actions: list[str] = []
    results: str = ""
    technologies: list[str] = []
    position: int = 0
    published: bool = True


class ProjectOut(ProjectIn, ORM):
    id: str


class PostIn(BaseModel):
    id: str | None = Field(default=None, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=120)
    title: str = Field(min_length=1, max_length=250)
    excerpt: str = ""
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    author: str = "Equipo NetSurex"
    category: str = ""
    icon_name: str = "Rocket"
    tags: list[str] = []
    content: str = ""
    published: bool = True


class PostOut(PostIn, ORM):
    id: str


class FaqIn(BaseModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    position: int = 0
    published: bool = True


class FaqOut(FaqIn, ORM):
    id: int


class TeamIn(BaseModel):
    id: str | None = Slug
    name: str = Field(min_length=1, max_length=160)
    role: str = ""
    bio: str = ""
    image: str | None = None
    linkedin: str = ""
    position: int = 0
    published: bool = True


class TeamOut(TeamIn, ORM):
    id: str


# ---------------------------------------------------------------- configuración


class Hours(BaseModel):
    days: str
    time: str


class Contact(BaseModel):
    email: str = ""
    privacy_email: str = ""
    phone_display: str = ""
    whatsapp: str = Field(default="", pattern=r"^\d*$", description="Solo dígitos, con código de país.")
    coverage: str = ""
    hours: list[Hours] = []


class Social(BaseModel):
    facebook: str = ""
    instagram: str = ""
    linkedin: str = ""
    github: str = ""
    x: str = ""


class SiteSettings(BaseModel):
    name: str = "NetSurex"
    tagline: str = ""
    short_description: str = ""
    founded_label: str = ""
    contact: Contact = Contact()
    social: Social = Social()


class QuoteSettings(BaseModel):
    currency: str = Field(default="USD", min_length=3, max_length=3)
    cctv: dict[str, Any] = {}
    software: dict[str, list[int]] = {}
    support: dict[str, Any] = {}


# ---------------------------------------------------------------- órdenes y leads

ORDER_STAGES = ["Recibido", "Diagnóstico", "En proceso", "Control de calidad", "Listo para entrega", "Entregado"]


class OrderEventOut(ORM):
    stage: int
    note: str
    created_at: datetime


class OrderIn(BaseModel):
    kind: str = Field(min_length=1, max_length=120)
    item: str = Field(min_length=1, max_length=250)
    stage: int = Field(default=0, ge=0, le=len(ORDER_STAGES) - 1)
    public_note: str = ""
    internal_note: str = ""
    customer_name: str = ""
    customer_contact: str = ""
    lead_id: int | None = None


OrderPatch = partial(OrderIn, "OrderPatch")


class OrderOut(OrderIn, ORM):
    id: int
    code: str
    created_at: datetime
    updated_at: datetime
    events: list[OrderEventOut] = []


class PublicOrder(BaseModel):
    code: str
    kind: str
    item: str
    stage: int
    stages: list[str]
    note: str
    updated: datetime
    history: list[OrderEventOut]


class LeadIn(BaseModel):
    kind: Literal["contact", "diagnosis", "quote"] = "contact"
    profile: Literal["B2B", "B2C"] = "B2B"
    name: str = Field(min_length=2, max_length=160)
    company: str = Field(default="", max_length=200)
    email: EmailStr
    phone: str = Field(default="", max_length=40)
    service_id: str = Field(default="", max_length=80)
    message: str = Field(default="", max_length=5000)
    quote: QuoteInput | None = None
    source_page: str = Field(default="", max_length=300)
    website: str = Field(default="", max_length=200, description="Referer URL para analíticas.")


class LeadOut(ORM):
    id: int
    kind: str
    profile: str
    name: str
    company: str
    email: str
    phone: str
    service_id: str
    service_title: str
    message: str
    estimate: dict | None
    status: str
    notes: str
    source_page: str
    created_at: datetime


class LeadPatch(BaseModel):
    status: Literal["nuevo", "contactado", "ganado", "perdido"] | None = None
    notes: str | None = None


class LeadCreated(BaseModel):
    id: int
    estimate: QuoteResult | None = None


# ---------------------------------------------------------------- auth


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=200)
