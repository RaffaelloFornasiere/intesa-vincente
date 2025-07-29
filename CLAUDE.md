# Intesa Vincente - Claude AI Context

This document provides comprehensive context for Claude AI when working on the Intesa Vincente project.

## Project Overview

**Intesa Vincente** is a digital implementation of an Italian TV show game where teams compete in word-guessing challenges. The game involves 4 players with distinct roles using a real-time web application.

### Game Mechanics

- **2 Word Givers** stand and give one-word clues alternately
- **1 Word Guesser** sits between them and tries to guess the target word
- **1 Controller** manages the game flow and scoring
- **60-second timer** per round (adjustable by controller)
- **Scoring**: +1 correct, -1 incorrect, penalties for rule violations
- **5-second countdown** when guesser stops to make final guess

## Technical Architecture

### Backend (FastAPI)
- **File**: `src/game/server.py`
- **WebSocket Manager**: `src/game/websocket_manager.py`
- **Session Manager**: `src/game/session_manager.py`
- **Static File Serving**: Serves React build from `/` route
- **Port**: 8000 (development), 9898 (production container)

### Frontend (React TypeScript)
- **Main App**: `src/ui/src/App.tsx` - Unified role-based routing
- **Controller**: `src/ui/src/Controller.tsx` - Full game management
- **Word Giver**: `src/ui/src/WordGiver.tsx` - Shows word, timer, "Passo" button
- **Word Guesser**: `src/ui/src/WordGuesser.tsx` - Timer, "Stop & Guess" button, countdown
- **Login Screen**: `src/ui/src/LoginScreen.tsx` - Role selection interface

### Session Codes
- **Generation**: Uses Faker library with patterns like `happy-cat-42`, `pizza-magic-77`
- **Purpose**: Replace UUIDs with memorable codes for easy sharing
- **Copy Button**: Controller has copy-to-clipboard functionality

## File Structure

```
intesa_vincente/
├── src/
│   ├── game/                    # FastAPI backend
│   │   ├── server.py           # Main server + static file serving
│   │   ├── websocket_manager.py # Real-time communication
│   │   ├── session_manager.py  # Game state & session codes
│   │   └── __init__.py
│   └── ui/                     # React frontend
│       ├── src/
│       │   ├── App.tsx         # Main app with role routing
│       │   ├── Controller.tsx  # Controller interface
│       │   ├── WordGiver.tsx   # Word giver interface
│       │   ├── WordGuesser.tsx # Word guesser interface
│       │   ├── LoginScreen.tsx # Role selection
│       │   └── utils/network.ts # IP detection & URLs
│       ├── build/              # Production build (served by FastAPI)
│       └── package.json
├── docker/                     # Containerization
│   ├── Dockerfile             # Multi-stage build
│   ├── docker-compose.yml     # Port 9898 deployment
│   └── README.md
├── sessions/                   # Game session persistence
├── words.json                  # 1200+ Italian words
├── requirements.txt            # Python dependencies
├── specification.md            # Original requirements
├── design.md                   # System design
└── PROGRESS.md                # Development status
```

## WebSocket Communication

### Message Types (Client → Server)
- `connect`: Initial connection with client type
- `start_game`: Begin/resume round (controller only)
- `stop_game`: Pause game (controller only)
- `pass_word`: Skip word (word givers only)
- `request_guess`: Trigger 5s countdown (word guesser only)
- `mark_word_correct/incorrect`: Score word (controller only)
- `adjust_timer`: Manual timer adjustment (controller only)
- `reset_game`: Full game reset (controller only)

### Message Types (Server → Client)
- `session_state`: Complete game state update
- `timer_update`: Timer value broadcast
- `countdown`: 5-second guess countdown
- `error`: Error messages

## Game States & Flow

1. **Lobby**: Initial state, waiting for players
2. **Playing**: Timer running, word givers giving clues
3. **Guessing**: 5-second countdown active (from stop or timer expiry)
4. **Paused**: Game stopped, controller can mark correct/incorrect

### Timer Logic (CRITICAL)
- **New word**: Timer = 60 seconds
- **Resume after pause**: Timer continues from saved value
- **After correct/incorrect**: Timer preserved for next word
- **Only reset to 60**: On new word or game reset

### Word Progression (CRITICAL)
- **Start game**: Pick new word only if none exists OR after correct/incorrect
- **Correct/incorrect**: Mark word used, save timer, pause game, set need_new_word flag
- **Next start**: Use saved timer value, pick new word due to flag

## Network Configuration

### Development
- **React Dev Server**: `localhost:3000`
- **FastAPI Backend**: `localhost:8000`
- **Mobile Access**: Auto-detects IP via WebRTC (e.g., `192.168.1.128:3000`)

### Production
- **Single Server**: FastAPI serves both frontend and API on same port
- **Static Files**: React build served from `/` route
- **Relative URLs**: Automatic detection for same-origin requests

## Authentication & Sessions

- **Controller**: Requires API key (env: `INTESA_API_KEY`, default: "test-key-123")
- **Other Clients**: Only need session code
- **Session Persistence**: Files in `sessions/{code}/used_words.json`
- **Word Management**: Repository-level `words.json`, per-session tracking

## Deployment

### Development
```bash
# Backend
cd src/game && python server.py

# Frontend (separate terminal)
cd src/ui && npm run start:network
```

### Production (Containerized)
```bash
cd docker
docker-compose up -d  # Runs on port 9898
```

## Key Implementation Details

### Role-Based UI
- Single React app with role selection at login
- Each role gets appropriate interface and permissions
- Shared components and styling

### Real-Time Synchronization
- Static timer display (no client-side countdown)
- WebSocket broadcasts for all state changes
- Connection status monitoring

### Mobile Support
- Network IP auto-detection for cross-device play
- Responsive design for phone screens
- Touch-friendly buttons and layouts

## Common Issues & Solutions

### Network Problems
- **Symptom**: Mobile can't connect to backend
- **Solution**: Check `utils/network.ts` IP detection logic

### Timer Issues
- **Symptom**: Timer not resuming correctly
- **Solution**: Verify `saved_timer` logic in `websocket_manager.py`

### WebSocket Disconnections
- **Symptom**: Connection drops unexpectedly
- **Solution**: Check `connect` message handling and client type detection

## Dependencies

### Backend
- `fastapi`: Web framework
- `uvicorn`: ASGI server
- `websockets`: WebSocket support
- `faker`: Session code generation
- `python-dotenv`: Environment variables

### Frontend
- `react`: UI framework
- `typescript`: Type safety
- `@types/*`: TypeScript definitions

## Environment Variables

- `INTESA_API_KEY`: Controller authentication (required)

## Testing Strategy

1. **Single Device**: Test with multiple browser tabs
2. **Network**: Use `npm run start:network` for mobile testing
3. **Production**: Test containerized version with `docker-compose`

## Code Style & Patterns

- **TypeScript**: Strict typing for React components
- **Async/Await**: For all async operations
- **Error Handling**: Try-catch blocks and graceful degradation
- **State Management**: React hooks, no external state library
- **Real-time**: WebSocket for all client-server communication

## Important Notes for Claude

1. **Never break timer resume logic** - Critical for gameplay
2. **Always preserve session codes** - Users rely on memorable codes
3. **Maintain WebSocket message contracts** - All clients depend on these
4. **Static file serving must work** - Production deployment requirement
5. **Role-based permissions** - Only controller can modify game state
6. **Network detection is fragile** - Test thoroughly on mobile devices

This context should enable Claude to understand, maintain, and extend the Intesa Vincente project effectively.