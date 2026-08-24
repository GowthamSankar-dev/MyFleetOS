"""
FastAPI application factory.

Wires together:
  - CORS middleware
  - Lifespan (startup / shutdown)
  - All routers
"""

import logging
import asyncio
from contextlib import asynccontextmanager

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import init_db, AsyncSessionLocal
from app.routes import auth, location, vehicles, websocket, pairing, geofences
from app.services import cleanup_stale_sessions

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


async def stale_session_worker():
    while True:
        await asyncio.sleep(5)
        try:
            async with AsyncSessionLocal() as db:
                await cleanup_stale_sessions(db)
        except Exception as e:
            logger.error(f"Error in stale_session_worker: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before the app starts accepting requests."""
    logger.info("⚡  Starting Fleet Tracking API…")
    await init_db()
    logger.info("✅  Database tables verified/created.")
    worker_task = asyncio.create_task(stale_session_worker())
    yield
    worker_task.cancel()
    logger.info("🛑  Shutting down Fleet Tracking API.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Fleet Tracking API",
        description="MVP backend for real-time GPS fleet tracking.",
        version="0.1.0",
        lifespan=lifespan,
    )

    # ── CORS — allow specific origins from configuration ────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Static files — serves gps_sender.html ─────────────────────────────────
    os.makedirs(STATIC_DIR, exist_ok=True)
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(auth.router)
    app.include_router(location.router)
    app.include_router(vehicles.router)
    app.include_router(pairing.router)
    app.include_router(geofences.router)
    app.include_router(websocket.router)



    @app.get("/simulator", include_in_schema=False)
    async def simulator_page():
        """Serve the GPS simulator page at /simulator"""
        return FileResponse(os.path.join(STATIC_DIR, "simulator.html"))

    @app.get("/share/{share_code}", include_in_schema=False)
    async def share_viewer_page(share_code: str):
        """Serve the public share tracking page at /share/{share_code}"""
        return FileResponse(os.path.join(STATIC_DIR, "share_viewer.html"))

    @app.get("/")
    async def root():
        return {
            "message": "Fleet Tracking API is running! 🚀",
            "docs": "/docs",
            "health": "/health"
        }

    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
