import os
import json
import random
from pathlib import Path
from fastapi import HTTPException
from faker import Faker
from dotenv import load_dotenv
load_dotenv()

class SessionManager:
    def __init__(self):
        self.sessions_dir = Path("sessions")
        self.sessions_dir.mkdir(exist_ok=True)
        self.active_sessions = {}
        self.api_key = os.getenv("INTESA_API_KEY", "test-key-123")
        self.fake = Faker(['it_IT', 'en_US'])  # Italian and English for variety
    
    def _generate_session_code(self) -> str:
        """Generate a funny, memorable session code using Faker's built-in providers"""
        patterns = [
            # Pattern 1: Faker slug (e.g., "three-image-son") 
            lambda: self.fake.slug(),
        ]
        
        # Pick a random pattern and generate
        pattern = random.choice(patterns)
        code = pattern().lower().replace(' ', '-')
        
        # Clean and limit length
        code = ''.join(c for c in code if c.isalnum() or c == '-')[:20]
        
        # Ensure uniqueness
        attempts = 0
        while code in self.active_sessions and attempts < 10:
            pattern = random.choice(patterns) 
            code = pattern().lower().replace(' ', '-')
            code = ''.join(c for c in code if c.isalnum() or c == '-')[:20]
            attempts += 1
            
        return code
    
    def create_session(self, api_key: str) -> str:
        if api_key != self.api_key:
            raise HTTPException(status_code=403, detail="Invalid API key")
        
        session_code = self._generate_session_code()
        session_dir = self.sessions_dir / session_code
        session_dir.mkdir(exist_ok=True)
        
        # Create default word files
        self._create_default_files(session_dir)
        
        # Initialize session state
        self.active_sessions[session_code] = {
            "uuid": session_code,
            "state": "lobby",
            "connected_clients": [],
            "timer": 60,
            "stats": {
                "correct": 0,
                "incorrect": 0,
                "total_points": 0
            },
            "current_word": None,
            "pass_count": 0,
            "need_new_word": False
        }
        
        return session_code
    
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
        print(f"Marking word '{word}' as used for session {session_uuid}")
        session_dir = self.sessions_dir / session_uuid
        used_words_file = session_dir / "used_words.json"
        
        if used_words_file.exists():
            used_words = json.loads(used_words_file.read_text())
            print(f"Current used words: {used_words}")
            if word not in used_words:
                used_words.append(word)
                with open(used_words_file, 'w') as f:
                    json.dump(used_words, f, indent=2)
                    f.flush()  # Force flush to disk
                    os.fsync(f.fileno())  # Force OS to write to disk
                print(f"Added '{word}' to used words. New list: {used_words}")
            else:
                print(f"Word '{word}' already in used words")
        else:
            print(f"Used words file does not exist: {used_words_file}")
    
    def clear_used_words(self, session_uuid: str):
        print(f"Clearing used words for session {session_uuid}")
        session_dir = self.sessions_dir / session_uuid
        used_words_file = session_dir / "used_words.json"
        
        if used_words_file.exists():
            with open(used_words_file, 'w') as f:
                json.dump([], f, indent=2)
                f.flush()  # Force flush to disk
                os.fsync(f.fileno())  # Force OS to write to disk
            print(f"Cleared used words file: {used_words_file}")
        else:
            print(f"Used words file does not exist: {used_words_file}")
    
    def validate_and_join_session(self, api_key: str, session_code: str) -> str:
        """Validate API key and allow controller to rejoin an existing session"""
        if api_key != self.api_key:
            raise HTTPException(status_code=403, detail="Invalid API key")
        
        # Check if session exists in active sessions or on disk
        if session_code not in self.active_sessions:
            # Try to load from disk
            session_dir = self.sessions_dir / session_code
            if session_dir.exists():
                # Recreate session in memory from disk
                self.active_sessions[session_code] = {
                    "uuid": session_code,
                    "state": "lobby",
                    "connected_clients": [],
                    "timer": 60,
                    "stats": {
                        "correct": 0,
                        "incorrect": 0,
                        "total_points": 0
                    },
                    "current_word": None,
                    "pass_count": 0,
                    "need_new_word": False
                }
                return session_code
            else:
                raise HTTPException(status_code=404, detail="Session not found")
        
        return session_code