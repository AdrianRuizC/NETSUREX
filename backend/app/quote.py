"""Cálculo del cotizador estimado rápido (fuente única de verdad para precios)."""

from typing import Literal

from pydantic import BaseModel, Field

# Límite máximo de cámaras CCTV (fuente única de verdad).
MAX_CAMERAS = 64

CAMERA_LABELS = {"analogHD": "Analógica HD", "ip": "IP", "ptz": "Domo PTZ"}
SOFTWARE_LABELS = {
    "landing": "Landing page",
    "corporateWeb": "Sitio web corporativo",
    "ecommerce": "Tienda e-commerce",
    "mobileApp": "App móvil (Android / iOS)",
    "multiplatformApp": "App multiplataforma (móvil, web y escritorio)",
    "customSystem": "Sistema a medida (ERP, CRM, POS, inventarios)",
    "aiIntegration": "Integración de IA / chatbot",
}


class QuoteInput(BaseModel):
    mode: Literal["cctv", "software"]
    cameras: int = Field(default=4, ge=1, le=MAX_CAMERAS)
    camera_type: Literal["analogHD", "ip", "ptz"] = "ip"
    remote: bool = True
    cloud: bool = False
    software_type: Literal[
        "landing", "corporateWeb", "ecommerce", "mobileApp", "multiplatformApp", "customSystem", "aiIntegration"
    ] = "multiplatformApp"


class QuoteResult(BaseModel):
    mode: str
    currency: str
    low: int
    high: int
    monthly: int = 0
    summary: str
    note: str


def estimate(data: QuoteInput, prices: dict) -> QuoteResult:
    currency = prices.get("currency", "USD")
    if data.mode == "cctv":
        c = prices.get("cctv", {})
        rec = c.get("recorder", {})
        recorder = rec.get("upTo8", 0) if data.cameras <= 8 else rec.get("upTo16", 0) if data.cameras <= 16 else rec.get("upTo32", 0)
        if data.cameras > 32:
            recorder += rec.get("upTo32", 0)  # segundo grabador
        per_camera = c.get("perCamera", {}).get(data.camera_type, 0)
        install = c.get("installationPerCamera", 0)
        total = data.cameras * (per_camera + install) + recorder
        if data.remote:
            total += c.get("remoteSetup", 0)
        extras = []
        if data.remote:
            extras.append("monitoreo remoto")
        if data.cloud:
            extras.append("respaldo en la nube")
        summary = f"CCTV: {data.cameras} cámara(s) {CAMERA_LABELS[data.camera_type]}" + (
            f", {', '.join(extras)}" if extras else ""
        )
        return QuoteResult(
            mode="cctv",
            currency=currency,
            low=round(total * 0.9),
            high=round(total * 1.15),
            monthly=c.get("cloudBackupMonthly", 0) if data.cloud else 0,
            summary=summary,
            note="Incluye equipos, instalación y configuración. Valor referencial sujeto a diagnóstico en sitio.",
        )
    software_prices = prices.get("software", {})
    price_pair = software_prices.get(data.software_type, [0, 0])
    low, high = int(price_pair[0]), int(price_pair[1])
    return QuoteResult(
        mode="software",
        currency=currency,
        low=low,
        high=high,
        summary=f"Software: {SOFTWARE_LABELS[data.software_type]}",
        note="Incluye diseño, desarrollo, pruebas y capacitación. Alojamiento y SLA se cotizan aparte.",
    )
