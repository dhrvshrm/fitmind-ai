from fastapi import FastAPI
import logging
from datetime import datetime

from app.config.database import connect_to_mongo, close_mongo_connection
from app.config.cors import setup_cors
from app.api.v1.router import router as v1_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FitMind AI API",
    description="AI-powered fitness coach",
    version="0.1.0"
)

setup_cors(app)
app.include_router(v1_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting FitMind AI Backend...")
    try:
        await connect_to_mongo()
        logger.info("Backend startup complete")
    except Exception as e:
        logger.info(f"MongoDB connection will be set up on Day 5")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down...")
    await close_mongo_connection()

@app.get("/")
async def root():
    return {
        "service": "FitMind AI API",
        "version": "0.1.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "FitMind AI Backend"}
