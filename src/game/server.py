import os
import uuid
import json
from pathlib import Path
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .session_manager import SessionManager
from .websocket_manager import WebSocketManager

app = FastAPI(title="Intesa Vincente Game Server")

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize managers
session_manager = SessionManager()
websocket_manager = WebSocketManager()
websocket_manager.set_session_manager(session_manager)

# Serve React static files
static_path = Path(__file__).parent.parent / "ui" / "build"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path / "static")), name="static")
    
    @app.get("/")
    async def serve_react_app():
        return FileResponse(str(static_path / "index.html"))
    
    # Catch-all route for React Router (SPA routing)
    @app.get("/{path:path}")
    async def serve_react_app_routes(path: str):
        # Don't catch API routes
        if path.startswith("api/") or path.startswith("ws/") or path.startswith("create-session"):
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(str(static_path / "index.html"))

@app.post("/create-session")
async def create_session(request: dict):
    api_key = request.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key required")
    
    session_uuid = session_manager.create_session(api_key)
    return {"session_uuid": session_uuid}

@app.websocket("/ws/{session_uuid}")
async def websocket_endpoint(websocket: WebSocket, session_uuid: str):
    await websocket_manager.connect(websocket, session_uuid, None)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)