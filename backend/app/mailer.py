import logging
import smtplib
from email.message import EmailMessage

from .config import get_settings
from .models import Lead

log = logging.getLogger("netsurex.mailer")

KIND_LABEL = {"contact": "Contacto", "diagnosis": "Diagnóstico", "quote": "Cotización"}


def notify_new_lead(lead: Lead) -> None:
    """Envía un aviso por email de una nueva solicitud. Si SMTP no está configurado, no hace nada."""
    s = get_settings()
    if not (s.smtp_host and s.notify_email and s.smtp_from):
        return
    msg = EmailMessage()
    msg["Subject"] = f"[NetSurex] Nueva solicitud de {KIND_LABEL.get(lead.kind, lead.kind)}: {lead.service_title or 'General'}"
    msg["From"] = s.smtp_from
    msg["To"] = s.notify_email
    msg["Reply-To"] = lead.email
    lines = [
        f"Tipo: {KIND_LABEL.get(lead.kind, lead.kind)}",
        f"Perfil: {'Empresa' if lead.profile == 'B2B' else 'Hogar / persona'}",
        f"Nombre: {lead.name}",
        f"Empresa: {lead.company}" if lead.company else "",
        f"Email: {lead.email}",
        f"Teléfono: {lead.phone}" if lead.phone else "",
        f"Servicio: {lead.service_title or 'Consulta general'}",
    ]
    if lead.estimate:
        e = lead.estimate
        lines.append(f"Estimado: {e['currency']} {e['low']} – {e['high']} ({e['summary']})")
    lines += ["", lead.message]
    msg.set_content("\n".join(line for line in lines if line is not None))
    try:
        with smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=15) as smtp:
            smtp.starttls()
            if s.smtp_user:
                smtp.login(s.smtp_user, s.smtp_password)
            smtp.send_message(msg)
    except Exception:  # noqa: BLE001 — una falla de correo no debe romper la solicitud
        log.exception("No se pudo enviar la notificación del lead %s", lead.id)
