from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def now() -> datetime:
    return datetime.now(timezone.utc)


class Ordered:
    position: Mapped[int] = mapped_column(Integer, default=0)


class Publishable(Ordered):
    published: Mapped[bool] = mapped_column(Boolean, default=True)


# ---------------------------------------------------------------- contenido


class Division(Base, Ordered):
    __tablename__ = "divisions"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    icon_name: Mapped[str] = mapped_column(String(60), default="ShieldCheck")
    summary: Mapped[str] = mapped_column(Text, default="")
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Service(Base, Publishable):
    __tablename__ = "services"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    division_id: Mapped[str] = mapped_column(ForeignKey("divisions.id", ondelete="RESTRICT"))
    audience: Mapped[str] = mapped_column(String(10), default="Ambos")  # B2B | B2C | Ambos
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    icon_name: Mapped[str] = mapped_column(String(60), default="ShieldCheck")
    tags: Mapped[list] = mapped_column(JSON, default=list)


class SupportPlan(Base, Publishable):
    __tablename__ = "support_plans"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    audience: Mapped[str] = mapped_column(String(10), default="Ambos")
    title: Mapped[str] = mapped_column(String(200))
    icon_name: Mapped[str] = mapped_column(String(60), default="ShieldCheck")
    description: Mapped[str] = mapped_column(Text, default="")
    features: Mapped[list] = mapped_column(JSON, default=list)
    highlighted: Mapped[bool] = mapped_column(Boolean, default=False)


class MethodologyStep(Base, Ordered):
    __tablename__ = "methodology_steps"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    step: Mapped[str] = mapped_column(String(10))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    icon_name: Mapped[str] = mapped_column(String(60), default="ShieldCheck")
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Project(Base, Publishable):
    __tablename__ = "projects"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(60), default="Software")
    division_id: Mapped[str | None] = mapped_column(ForeignKey("divisions.id", ondelete="SET NULL"), nullable=True)
    short_description: Mapped[str] = mapped_column(Text, default="")
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    challenge: Mapped[str] = mapped_column(Text, default="")
    solution: Mapped[str] = mapped_column(Text, default="")
    key_actions: Mapped[list] = mapped_column(JSON, default=list)
    results: Mapped[str] = mapped_column(Text, default="")
    technologies: Mapped[list] = mapped_column(JSON, default=list)


class BlogPost(Base):
    __tablename__ = "blog_posts"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    title: Mapped[str] = mapped_column(String(250))
    excerpt: Mapped[str] = mapped_column(Text, default="")
    date: Mapped[str] = mapped_column(String(10))  # YYYY-MM-DD
    author: Mapped[str] = mapped_column(String(120), default="Equipo NetSurex")
    category: Mapped[str] = mapped_column(String(80), default="")
    icon_name: Mapped[str] = mapped_column(String(60), default="Rocket")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    content: Mapped[str] = mapped_column(Text, default="")
    published: Mapped[bool] = mapped_column(Boolean, default=True)


class Faq(Base, Publishable):
    __tablename__ = "faqs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)


class TeamMember(Base, Publishable):
    __tablename__ = "team_members"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(160), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    linkedin: Mapped[str] = mapped_column(String(300), default="")


class SettingEntry(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(40), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)


# ---------------------------------------------------------------- operación


class Order(Base):
    """Orden de reparación o proyecto consultable con el rastreador."""

    __tablename__ = "orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    kind: Mapped[str] = mapped_column(String(120))
    item: Mapped[str] = mapped_column(String(250))
    stage: Mapped[int] = mapped_column(Integer, default=0)
    public_note: Mapped[str] = mapped_column(Text, default="")
    internal_note: Mapped[str] = mapped_column(Text, default="")
    customer_name: Mapped[str] = mapped_column(String(160), default="")
    customer_contact: Mapped[str] = mapped_column(String(200), default="")
    lead_id: Mapped[int | None] = mapped_column(ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    events: Mapped[list["OrderEvent"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderEvent.created_at"
    )


class OrderEvent(Base):
    __tablename__ = "order_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    stage: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    order: Mapped[Order] = relationship(back_populates="events")


class Lead(Base):
    """Solicitud recibida desde el sitio: contacto, diagnóstico o cotización."""

    __tablename__ = "leads"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kind: Mapped[str] = mapped_column(String(20), default="contact")  # contact | diagnosis | quote
    profile: Mapped[str] = mapped_column(String(5), default="B2B")  # B2B | B2C
    name: Mapped[str] = mapped_column(String(160))
    company: Mapped[str] = mapped_column(String(200), default="")
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(40), default="")
    service_id: Mapped[str] = mapped_column(String(80), default="")
    service_title: Mapped[str] = mapped_column(String(200), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    estimate: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="nuevo")  # nuevo | contactado | ganado | perdido
    notes: Mapped[str] = mapped_column(Text, default="")
    source_page: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)


class AdminUser(Base):
    __tablename__ = "admin_users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(300))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
