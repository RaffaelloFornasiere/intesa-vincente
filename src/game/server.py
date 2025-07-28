import os
import uuid
import json
from pathlib import Path
from typing import Dict
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

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

@app.post("/create-session")
async def create_session(request: dict):
    api_key = request.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key required")
    
    session_uuid = session_manager.create_session(api_key)
    return {"session_uuid": session_uuid}

@app.websocket("/ws/{session_uuid}")
async def websocket_endpoint(websocket: WebSocket, session_uuid: str):
    await websocket_manager.connect(websocket, session_uuid, "controller")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)