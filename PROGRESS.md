# Intesa Vincente - Development Progress

## Project Overview
Italian TV show game implementation where two contestants give word clues to help a third player guess target words. Built with FastAPI backend and React TypeScript frontend.

## ✅ Completed Features

### 🏗️ Architecture & Setup
- **FastAPI Backend** with WebSocket support for real-time communication
- **React TypeScript Frontend** with proper type definitions
- **Modular Code Structure** with separate managers for sessions and WebSocket handling
- **CORS Configuration** for cross-origin requests
- **Environment-based Configuration** with dotenv support

### 🔐 Authentication & Session Management
- **API Key Authentication** for controller access (environment variable `INTESA_API_KEY`)
- **UUID-based Game Sessions** with isolated session management
- **Session File Structure**: `sessions/{uuid}/used_words.json`
- **Automatic Session Directory Creation** when new sessions are created

### 🎮 Core Game Mechanics
- **Four Client Types** (as per specification):
  - 1 Controller (full access)
  - 2 Word Givers (planned)
  - 1 Word Guesser (planned)
- **Game States**: lobby, playing, paused
- **Word Management System**:
  - Repository-level `words.json` with 1200+ Italian words
  - Per-session `used_words.json` tracking
  - Random word selection from unused words
  - Automatic word progression after scoring

### ⏱️ Timer System
- **60-second Default Timer** with real-time countdown
- **Static Timer Display** (updates only via WebSocket messages)
- **Manual Timer Controls**: ±1s, ±5s, ±10s buttons
- **Timer Resume Feature**: Continues from stopped position on restart
- **Timer Pause/Resume**: Maintains timer state between game sessions

### 🎯 Scoring System
- **Point Tracking**: Correct (+1), Incorrect (-1)
- **Statistics Display**: Total points, correct/incorrect counts
- **Real-time Score Updates** via WebSocket
- **Score Persistence** throughout session

### 🌐 Network & Connectivity
- **Auto IP Detection** using WebRTC for cross-device testing
- **Network-accessible Frontend** (`npm run start:network`)
- **WebSocket Real-time Communication** with connection status display
- **Mobile-friendly Testing** on same WiFi network

### 🖥️ User Interface
- **Controller Dashboard** with comprehensive game controls
- **Game Status Display** with color-coded states
- **Current Word Display** for controller
- **Timer Warning Animation** (red + pulse when ≤10 seconds)
- **Disabled Button States** to prevent invalid actions
- **Responsive Button Layout** with hover effects

### 📁 File Persistence
- **Forced File Flushing** with `f.flush()` and `os.fsync()` for immediate writes
- **Used Words Tracking** automatically updated on word actions
- **Session Reset Functionality** clears used words and statistics

### 🎛️ Game Controls
- **Start Game**: Picks new word, starts timer (disabled when playing)
- **Stop Game**: Pauses timer, enables word actions (disabled when not playing)
- **Reset Game**: Complete session reset (timer, stats, used words)
- **Word Actions** (enabled only when paused):
  - ✓ Correct (+1): Mark correct, new word
  - ✗ Incorrect (-1): Mark incorrect, new word
- **Timer Adjustments**: Manual ±seconds controls

## 🏗️ Technical Implementation

### Backend Structure
```
src/game/
├── server.py              # FastAPI app with routing
├── session_manager.py     # Session creation, word management
├── websocket_manager.py   # WebSocket handling, game logic
└── __init__.py
```

### Frontend Structure
```
src/ui/src/
├── App.tsx               # Main controller application
├── App.css               # Styling and animations
├── utils/network.ts      # Auto IP detection utilities
└── index.js             # React app entry point
```

### WebSocket Message Types
**Client → Server:**
- `connect`, `start_game`, `stop_game`, `reset_game`
- `mark_word_correct`, `mark_word_incorrect`
- `adjust_timer`, `get_state`, `test_connection`

**Server → Client:**
- `session_state`, `timer_update`, `test_response`
- `game_ended`, `error`, `connection_status`

### Game Flow States
1. **Lobby**: Initial state, waiting to start
2. **Playing**: Timer running, word actions disabled
3. **Paused**: Timer stopped, word actions enabled

## 🗂️ File System
```
├── words.json                    # 1200+ Italian words (repository level)
├── sessions/
│   └── {uuid}/
│       └── used_words.json      # Session-specific used words
├── src/game/                    # Backend code
├── src/ui/                      # Frontend code
├── requirements.txt             # Python dependencies
├── design.md                    # System architecture
├── specification.md             # Original requirements
└── PROGRESS.md                  # This file
```

## ⚙️ Configuration & Setup

### Environment Variables
- `INTESA_API_KEY`: Controller authentication (default: "test-key-123")

### Running the Application
**Backend:**
```bash
pip install -r requirements.txt
cd src/game
python server.py
```

**Frontend:**
```bash
cd src/ui
npm install
npm run start:network  # For network access
```

### Testing Setup
- **Desktop**: `http://localhost:3000`
- **Mobile**: `http://192.168.1.128:3000` (auto-detected IP)
- **API**: `http://192.168.1.128:8000`

## 🎯 Current Status
The **Controller client** is fully functional with:
- Complete game state management
- Real-time timer with manual controls
- Word progression and scoring
- File persistence with immediate writes
- Network accessibility for cross-device testing
- Clean, intuitive UI with proper button states

## 🚀 Next Steps (Planned)
1. **Word Giver Clients** (2x): Display word and timer, "Passo" button
2. **Word Guesser Client**: Timer display, "Stop" button, 5s guess countdown
3. **Multi-client Testing**: Full 4-player game simulation
4. **Additional Game Features**: Enhanced statistics, game history
5. **UI Polish**: Client-specific styling, mobile optimization

## 🧪 Testing Notes
- Game mechanics work as intended with proper state management
- File persistence confirmed with immediate disk writes
- Timer system accurate with pause/resume functionality
- Word management prevents duplicates and tracks usage
- Network connectivity tested across devices
- All core game flows operational

## 📋 Known Issues
- None currently identified in implemented features
- Controller-only implementation complete and stable