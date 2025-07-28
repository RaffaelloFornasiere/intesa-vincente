import os
import uuid
import json
from pathlib import Path
from fastapi import HTTPException
from dotenv import load_dotenv
load_dotenv()

class SessionManager:
    def __init__(self):
        self.sessions_dir = Path("sessions")
        self.sessions_dir.mkdir(exist_ok=True)
        self.active_sessions = {}
        self.api_key = os.getenv("INTESA_API_KEY", "test-key-123")
    
    def create_session(self, api_key: str) -> str:
        if api_key != self.api_key:
            raise HTTPException(status_code=403, detail="Invalid API key")
        
        session_uuid = str(uuid.uuid4())
        session_dir = self.sessions_dir / session_uuid
        session_dir.mkdir(exist_ok=True)
        
        # Create default word files
        self._create_default_files(session_dir)
        
        # Initialize session state
        self.active_sessions[session_uuid] = {
            "uuid": session_uuid,
            "state": "lobby",
            "connected_clients": [],
            "timer": 60,
            "stats": {
                "correct": 0,
                "incorrect": 0,
                "total_points": 0
            },
            "current_word": None
        }
        
        return session_uuid
    
    def get_session(self, session_uuid: str) -> dict:
        return self.active_sessions.get(session_uuid)
    
    def _create_default_files(self, session_dir: Path):
        used_words_file = session_dir / "used_words.json"
        
        if not used_words_file.exists():
            used_words_file.write_text(json.dumps([], indent=2))
    
    def get_available_words(self, session_uuid: str) -> list:
        # Use repo-level words.json
        repo_words_file = Path("words.json")
        session_dir = self.sessions_dir / session_uuid
        used_words_file = session_dir / "used_words.json"
        
        if not repo_words_file.exists() or not used_words_file.exists():
            return []
        
        all_words = json.loads(repo_words_file.read_text())
        used_words = json.loads(used_words_file.read_text())
        
        return [word for word in all_words if word not in used_words]
    
    def pick_new_word(self, session_uuid: str) -> str:
        import random
        available_words = self.get_available_words(session_uuid)
        if not available_words:
            return None
        
        word = random.choice(available_words)
        session = self.get_session(session_uuid)
        if session:
            session["current_word"] = word
        
        return word
    
    def mark_word_used(self, session_uuid: str, word: str):
        session_dir = self.sessions_dir / session_uuid
        used_words_file = session_dir / "used_words.json"
        
        if used_words_file.exists():
            used_words = json.loads(used_words_file.read_text())
            if word not in used_words:
                used_words.append(word)
                used_words_file.write_text(json.dumps(used_words, indent=2))