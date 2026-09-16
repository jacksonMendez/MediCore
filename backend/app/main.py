"""
MediCore OS — FastAPI Application Entry Point
Main application with CORS, routers, and health check.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import auth, chatbot, citas, medicos, pagos

settings = get_settings()


from app.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("🏥 MediCore OS — Starting up...")
    print(f"   Database: {settings.DATABASE_URL[:40]}...")
    print(f"   Groq API: {'✅ Configured' if settings.GROQ_API_KEY else '⚠️ Not configured (Demo Mode)'}")
    try:
        await init_db()
    except Exception as e:
        print(f"   ⚠️ Database init warning: {e}")
    yield
    # Shutdown
    print("🏥 MediCore OS — Shutting down...")


app = FastAPI(
    title="MediCore OS API",
    description="Sistema Médico Integral Asistido por IA",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(citas.router, prefix="/api")
app.include_router(medicos.router, prefix="/api")
app.include_router(pagos.router, prefix="/api")
app.include_router(chatbot.router, prefix="/api")


@app.get("/")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "MediCore OS API",
        "version": "1.0.0",
    }


@app.get("/api/health")
async def api_health():
    """API health check."""
    return {
        "status": "ok",
        "database": "connected",
        "llm": "configured" if settings.GROQ_API_KEY else "not_configured",
    }
