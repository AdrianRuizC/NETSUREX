import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from .config import get_settings
from .db import init_db
from .routers import admin, auth, public

logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    settings = get_settings()
    settings.resolved_secret_key()  # falla al iniciar si falta en producción
    init_db()

    app = FastAPI(
        title="NetSurex API",
        version="1.0.0",
        docs_url="/api/docs" if settings.environment != "production" else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if settings.environment != "production" else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.exception_handler(IntegrityError)
    async def integrity_error(_: Request, exc: IntegrityError):
        return JSONResponse(
            status_code=409,
            content={"detail": "La operación viola una relación o un valor único (¿referencia inexistente o en uso?)."},
        )

    @app.get("/api/health", tags=["sistema"])
    def health():
        return {"status": "ok"}

    for r in (public.router, auth.router, admin.router):
        app.include_router(r, prefix="/api")

    settings.uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")

    # Opcional: servir el frontend compilado (SPA) desde el mismo proceso.
    dist = settings.frontend_dist
    if dist and (dist / "index.html").exists():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def spa(path: str):
            if path.startswith("api/"):
                return JSONResponse(status_code=404, content={"detail": "Not Found"})
            if path == "login" or path == "admin" or path.startswith("admin/"):
                admin_index = dist / "admin" / "index.html"
                if (dist / path).is_file() and path != "admin":
                    return FileResponse(dist / path)
                if admin_index.is_file():
                    return FileResponse(admin_index)
                return JSONResponse(status_code=503, content={"detail": "Panel de administración no disponible."})
            target = (dist / path).resolve()
            if path and target.is_file() and dist.resolve() in target.parents:
                return FileResponse(target)
            return FileResponse(dist / "index.html")

    return app


app = create_app()
