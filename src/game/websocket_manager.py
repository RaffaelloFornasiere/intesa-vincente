import asyncio
import uuid
from typing import Dict
from fastapi import WebSocket, WebSocketDisconnect
from .session_manager import SessionManager

class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}
        # Track which session and client type each connection belongs to
        self.connection_metadata: Dict[str, Dict] = {}
        self.session_manager = None
        self.timer_tasks: Dict[str, asyncio.Task] = {}
    
    def set_session_manager(self, session_manager: SessionManager):
        self.session_manager = session_manager
    
    async def connect(self, websocket: WebSocket, session_uuid: str, client_type: str = None):
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
        
        connection_id = None  # Initialize connection_id before try block
        initialized_client_type = client_type  # Keep track of client_type for error handling
        
        try:
            # If client_type not provided, wait for connect message
            if client_type is None:
                first_message = await websocket.receive_json()
                if first_message.get("type") == "connect":
                    client_type = first_message.get("client_type")
                    if not client_type:
                        await websocket.send_json({"error": "Client type required"})
                        await websocket.close()
                        return
                else:
                    await websocket.send_json({"error": "Expected connect message"})
                    await websocket.close()
                    return
            
            # Store connection with unique ID
            connection_id = str(uuid.uuid4())
            self.connections[connection_id] = websocket
            self.connection_metadata[connection_id] = {
                "session_uuid": session_uuid,
                "client_type": client_type
            }
            print(f"Connection established: {connection_id} for {client_type} in session {session_uuid}")
            print(f"Total connections now: {len(self.connections)}")
            
            # Add to session
            if client_type not in session["connected_clients"]:
                session["connected_clients"].append(client_type)
                print(f"Added {client_type} to session {session_uuid} connected_clients")
            
            # Send initial state (with error handling in case connection closes quickly)
            try:
                await self._send_session_state(websocket, session)
                await self._handle_messages(websocket, session_uuid, client_type, connection_id)
            except WebSocketDisconnect:
                print(f"WebSocket disconnected during initial setup for {client_type}")
        except WebSocketDisconnect:
            if connection_id and client_type:
                await self._disconnect(connection_id, session, client_type)
            else:
                print(f"WebSocket disconnected before establishing connection (client_type: {initialized_client_type})")
        except Exception as e:
            print(f"Unexpected error in WebSocket connection: {e}")
            if connection_id and connection_id in self.connections and client_type:
                await self._disconnect(connection_id, session, client_type)
    
    async def _handle_messages(self, websocket: WebSocket, session_uuid: str, client_type: str, connection_id: str):
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
            
            elif data.get("type") == "start_game" and client_type == "controller":
                await self._start_game(session_uuid)
            
            elif data.get("type") == "stop_game" and client_type == "controller":
                await self._stop_game(session_uuid)
            
            elif data.get("type") == "adjust_timer" and client_type == "controller":
                seconds = data.get("seconds", 0)
                await self._adjust_timer(session_uuid, seconds)
            
            elif data.get("type") == "adjust_stats" and client_type == "controller":
                stat_type = data.get("stat_type")
                delta = data.get("delta", 0)
                await self._adjust_stats(session_uuid, stat_type, delta)
            
            elif data.get("type") == "mark_word_correct" and client_type == "controller":
                await self._mark_word_correct(session_uuid)
            
            elif data.get("type") == "mark_word_incorrect" and client_type == "controller":
                await self._mark_word_incorrect(session_uuid)
            
            elif data.get("type") == "pass_word" and client_type in ["word_giver_1", "word_giver_2"]:
                await self._pass_word(session_uuid, websocket)
            
            elif data.get("type") == "request_guess" and client_type == "word_guesser":
                print(f"Word guesser requesting guess for session {session_uuid}")
                await self._request_guess(session_uuid)
            
            elif data.get("type") == "reset_game" and client_type == "controller":
                await self._reset_game(session_uuid)
    
    async def _send_session_state(self, websocket: WebSocket, session: dict):
        print(f"Sending session state: {session}")
        try:
            await websocket.send_json({
                "type": "session_state",
                "session": session
            })
            print("Session state sent")
        except Exception as e:
            print(f"Failed to send session state: {e}")
    
    async def _start_game(self, session_uuid: str):
        session = self.session_manager.get_session(session_uuid)
        if not session:
            return
        
        # Always pick a new word when starting the game
        word = self.session_manager.pick_new_word(session_uuid)
        if not word:
            await self._broadcast_to_session(session_uuid, {
                "type": "error",  
                "message": "No more words available"
            })
            return
        
        # Set the new word
        session["current_word"] = word
        
        # If timer is 0 or doesn't exist, set to 60
        if not session.get("timer") or session["timer"] == 0:
            session["timer"] = 60
        
        # Start/resume game
        session["state"] = "playing"
        
        # Start timer
        if session_uuid in self.timer_tasks:
            self.timer_tasks[session_uuid].cancel()
        
        self.timer_tasks[session_uuid] = asyncio.create_task(
            self._run_timer(session_uuid)
        )
        
        await self._broadcast_session_state(session_uuid)
    
    async def _stop_game(self, session_uuid: str):
        session = self.session_manager.get_session(session_uuid)
        if not session:
            return
        
        session["state"] = "paused"
        
        # Stop timer
        if session_uuid in self.timer_tasks:
            self.timer_tasks[session_uuid].cancel()
            del self.timer_tasks[session_uuid]
        
        await self._broadcast_session_state(session_uuid)
    
    async def _adjust_timer(self, session_uuid: str, seconds: int):
        session = self.session_manager.get_session(session_uuid)
        if not session:
            return
        
        session["timer"] = max(0, session["timer"] + seconds)
        
        await self._broadcast_session_state(session_uuid)
    
    async def _adjust_stats(self, session_uuid: str, stat_type: str, delta: int):
        session = self.session_manager.get_session(session_uuid)
        if not session:
            return
        
        # Manual adjustments - each stat is independent
        if stat_type == "correct":
            session["stats"]["correct"] = max(0, session["stats"]["correct"] + delta)
        elif stat_type == "incorrect":
            session["stats"]["incorrect"] = max(0, session["stats"]["incorrect"] + delta)
        elif stat_type == "total_points":
            session["stats"]["total_points"] = session["stats"]["total_points"] + delta
        
        await self._broadcast_session_state(session_uuid)
    
    async def _mark_word_correct(self, session_uuid: str):
        print(f"_mark_word_correct called for session {session_uuid}")
        session = self.session_manager.get_session(session_uuid)
        if not session or not session.get("current_word"):
            print("No session or current word found")
            return
        
        current_word = session["current_word"]
        print(f"Marking word '{current_word}' as correct")
        
        # Mark word as used and update stats
        self.session_manager.mark_word_used(session_uuid, current_word)
        session["stats"]["correct"] += 1
        session["stats"]["total_points"] += 1
        
        # Pause game - controller needs to start next round
        session["state"] = "paused"
        
        # Stop timer if running
        if session_uuid in self.timer_tasks:
            self.timer_tasks[session_uuid].cancel()
            del self.timer_tasks[session_uuid]
        
        await self._broadcast_session_state(session_uuid)
    
    async def _mark_word_incorrect(self, session_uuid: str):
        print(f"_mark_word_incorrect called for session {session_uuid}")
        session = self.session_manager.get_session(session_uuid)
        if not session or not session.get("current_word"):
            print("No session or current word found")
            return
        
        current_word = session["current_word"]
        print(f"Marking word '{current_word}' as incorrect")
        
        # Mark word as used and update stats
        self.session_manager.mark_word_used(session_uuid, current_word)
        session["stats"]["incorrect"] += 1
        # Prevent negative points
        session["stats"]["total_points"] = max(0, session["stats"]["total_points"] - 1)
        
        # Pause game - controller needs to start next round
        session["state"] = "paused"
        
        # Stop timer if running
        if session_uuid in self.timer_tasks:
            self.timer_tasks[session_uuid].cancel()
            del self.timer_tasks[session_uuid]
        
        await self._broadcast_session_state(session_uuid)
    
    
    async def _pick_new_word_and_continue(self, session_uuid: str):
        session = self.session_manager.get_session(session_uuid)
        if not session:
            return
        
        # Pick a new word
        word = self.session_manager.pick_new_word(session_uuid)
        if not word:
            # No more words available
            session["state"] = "paused"
            session["current_word"] = None
            if session_uuid in self.timer_tasks:
                self.timer_tasks[session_uuid].cancel()
                del self.timer_tasks[session_uuid]
            
            await self._broadcast_to_session(session_uuid, {
                "type": "game_ended",
                "message": "No more words available"
            })
        else:
            # Continue with new word, reset timer to 60
            session["current_word"] = word
            session["timer"] = 60
            
            # Restart timer if game was playing
            if session["state"] == "playing":
                if session_uuid in self.timer_tasks:
                    self.timer_tasks[session_uuid].cancel()
                
                self.timer_tasks[session_uuid] = asyncio.create_task(
                    self._run_timer(session_uuid)
                )
        
        await self._broadcast_session_state(session_uuid)
    
    async def _pass_word(self, session_uuid: str, websocket: WebSocket):
        """Handle word pass - stops the game (controller must restart)"""
        session = self.session_manager.get_session(session_uuid)
        if not session:
            return
        
        # Check if pass limit reached (3 passes per game)
        if session.get("pass_count", 0) >= 3:
            await websocket.send_json({
                "type": "error",
                "message": "Pass limit reached (3 per game)"
            })
            return
        
        # Increment pass count
        session["pass_count"] = session.get("pass_count", 0) + 1
        
        # Broadcast pass event to all clients (especially controller for buzz sound)
        await self._broadcast_to_session(session_uuid, {
            "type": "pass_event",
            "message": "Word passed"
        })
        
        # Just stop the game - new word will be picked when controller presses inizia gioco
        session["state"] = "paused"
        
        # Stop timer
        if session_uuid in self.timer_tasks:
            self.timer_tasks[session_uuid].cancel()
            del self.timer_tasks[session_uuid]
        
        await self._broadcast_session_state(session_uuid)
    
    async def _request_guess(self, session_uuid: str):
        """Handle guess request - stops the game and starts 5s countdown"""
        print(f"_request_guess called for session {session_uuid}")
        session = self.session_manager.get_session(session_uuid)
        if not session:
            print("No session found")
            return
        
        print(f"Current session state: {session['state']}")
        
        # Broadcast guess event to all clients (especially controller for buzz sound)
        await self._broadcast_to_session(session_uuid, {
            "type": "guess_event",
            "message": "Guess requested"
        })
        
        # Stop the game
        session["state"] = "guessing"
        
        # Stop timer
        if session_uuid in self.timer_tasks:
            self.timer_tasks[session_uuid].cancel()
            del self.timer_tasks[session_uuid]
            print("Timer task cancelled")
        
        await self._broadcast_session_state(session_uuid)
        print("Session state broadcasted")
        
        # Start 5-second countdown as a task
        print("Starting countdown task")
        asyncio.create_task(self._start_guess_countdown(session_uuid))
    
    async def _start_guess_countdown(self, session_uuid: str):
        """Run 5-second countdown for guessing"""
        for seconds in range(5, 0, -1):
            await self._broadcast_to_session(session_uuid, {
                "type": "countdown",
                "seconds": seconds
            })
            await asyncio.sleep(1)
        
        # Countdown finished - return to paused state
        await self._broadcast_to_session(session_uuid, {
            "type": "countdown",
            "seconds": 0
        })
        
        session = self.session_manager.get_session(session_uuid)
        if session:
            session["state"] = "paused"
            await self._broadcast_session_state(session_uuid)
    
    async def _reset_game(self, session_uuid: str):
        print(f"_reset_game called for session {session_uuid}")
        session = self.session_manager.get_session(session_uuid)
        if not session:
            print("No session found")
            return
        
        # Stop timer if running
        if session_uuid in self.timer_tasks:
            self.timer_tasks[session_uuid].cancel()
            del self.timer_tasks[session_uuid]
        
        # Reset session state
        session["state"] = "lobby"
        session["timer"] = 60
        session["current_word"] = None
        session["stats"]["correct"] = 0
        session["stats"]["incorrect"] = 0
        session["stats"]["total_points"] = 0
        session["pass_count"] = 0  # Reset pass count on game reset
        session["need_new_word"] = False  # Reset need_new_word flag
        session["saved_timer"] = None  # Clear any saved timer
        
        # Clear used words
        self.session_manager.clear_used_words(session_uuid)
        
        print(f"Game reset for session {session_uuid}")
        await self._broadcast_session_state(session_uuid)
    
    async def _run_timer(self, session_uuid: str):
        try:
            while True:
                session = self.session_manager.get_session(session_uuid)
                if not session or session["timer"] <= 0:
                    break
                
                await asyncio.sleep(1)
                session["timer"] -= 1
                
                # Broadcast timer update
                await self._broadcast_to_session(session_uuid, {
                    "type": "timer_update",
                    "timer": session["timer"]
                })
                
            # Timer expired - start guess countdown automatically
            session = self.session_manager.get_session(session_uuid)
            if session:
                print(f"Timer expired for session {session_uuid}, starting guess countdown")
                session["state"] = "guessing"
                await self._broadcast_session_state(session_uuid)
                
                # Start 5-second countdown automatically
                asyncio.create_task(self._start_guess_countdown(session_uuid))
                
        except asyncio.CancelledError:
            pass
    
    async def _broadcast_session_state(self, session_uuid: str):
        session = self.session_manager.get_session(session_uuid)
        if session:
            await self._broadcast_to_session(session_uuid, {
                "type": "session_state",
                "session": session
            })
    
    async def _broadcast_to_session(self, session_uuid: str, message: dict):
        # Find all connections for this session using metadata
        session_connections = []
        for conn_id, metadata in self.connection_metadata.items():
            if metadata["session_uuid"] == session_uuid and conn_id in self.connections:
                session_connections.append((conn_id, self.connections[conn_id], metadata["client_type"]))
        
        print(f"Broadcasting to session {session_uuid}: {len(session_connections)} connections found")
        print(f"Connection details: {[(conn_id, client_type) for conn_id, _, client_type in session_connections]}")
        
        for conn_id, websocket, client_type in session_connections:
            try:
                await websocket.send_json(message)
                print(f"Message sent successfully to {client_type} (connection {conn_id})")
            except Exception as e:
                print(f"Failed to send message to {client_type} (connection {conn_id}): {e}")
                # Connection might be closed, remove it
                if conn_id in self.connections:
                    del self.connections[conn_id]
                if conn_id in self.connection_metadata:
                    del self.connection_metadata[conn_id]
    
    async def _disconnect(self, connection_id: str, session: dict, client_type: str):
        """Handle client disconnection"""
        print(f"Client {client_type} disconnected from session {session['uuid']} (connection {connection_id})")
        
        # Remove from connections
        if connection_id in self.connections:
            del self.connections[connection_id]
        if connection_id in self.connection_metadata:
            del self.connection_metadata[connection_id]
        
        # Remove from session
        if client_type in session["connected_clients"]:
            session["connected_clients"].remove(client_type)
        
        # Broadcast updated state
        await self._broadcast_session_state(session["uuid"])