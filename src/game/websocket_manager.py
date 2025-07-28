from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect
from .session_manager import SessionManager

class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        self.session_manager = None
    
    def set_session_manager(self, session_manager: SessionManager):
        self.session_manager = session_manager
    
    async def connect(self, websocket: WebSocket, session_uuid: str, client_type: str):
        await websocket.accept()
        
        if not self.session_manager:
            await websocket.send_json({"error": "Server not initialized"})
            await websocket.close()
            return
        
        session = self.session_manager.get_session(session_uuid)
        if not session:
            await websocket.send_json({"error": "Session not found"})
            await websocket.close()
            return
        
        # Store connection
        connection_id = f"{session_uuid}_{client_type}"
        self.connections[connection_id] = websocket
        
        # Add to session
        if client_type not in session["connected_clients"]:
            session["connected_clients"].append(client_type)
        
        # Send initial state
        await self._send_session_state(websocket, session)
        
        try:
            await self._handle_messages(websocket, session_uuid, client_type)
        except WebSocketDisconnect:
            await self._disconnect(connection_id, session, client_type)
    
    async def _handle_messages(self, websocket: WebSocket, session_uuid: str, client_type: str):
        while True:
            data = await websocket.receive_json()
            session = self.session_manager.get_session(session_uuid)
            
            if not session:
                await websocket.send_json({"error": "Session not found"})
                break
            
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif data.get("type") == "get_state":
                print("get_state - sending response")
                await self._send_session_state(websocket, session)
                print("get_state - response sent")
            
            elif data.get("type") == "test_connection":
                print("test_connection - sending response")
                await websocket.send_json({
                    "type": "test_response",
                    "message": "Connection test successful",
                    "client_type": client_type,
                    "session_uuid": session_uuid
                })
                print("test_connection - response sent")
    
    async def _send_session_state(self, websocket: WebSocket, session: dict):
        print(f"Sending session state: {session}")
        await websocket.send_json({
            "type": "session_state",
            "session": session
        })
        print("Session state sent")
    
    async def _disconnect(self, connection_id: str, session: dict, client_type: str):
        if connection_id in self.connections:
            del self.connections[connection_id]
        
        if client_type in session["connected_clients"]:
            session["connected_clients"].remove(client_type)