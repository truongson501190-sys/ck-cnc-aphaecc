# backend_ai/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from api.ai import router as ai_router
from api.learn import router as learn_router
from api.import_erp import router as import_router
from api.assistant import router as assistant_router

# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="🤖 ERP AI",
    description="ERP AI - Vision, OCR, Brain, Memory, Learning, Knowledge, Automation, Analytics, Assistant",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# ROUTERS
# ============================================================

app.include_router(ai_router)
app.include_router(learn_router)
app.include_router(import_router)
app.include_router(assistant_router)

# ============================================================
# ROOT & HEALTH
# ============================================================

@app.get("/")
async def root():
    return {
        "name": "🤖 ERP AI",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "parse": "/api/ai/document/parse",
            "learn": "/api/ai/learn",
            "import": "/api/ai/import",
            "assistant_chat": "/assistant/chat",
            "assistant_stats": "/assistant/stats"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )

    from fastapi import FastAPI
from auth.routes import router as auth_router

app = FastAPI(title="Backend AI Gateway")
app.include_router(auth_router)
