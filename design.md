# Intesa Vincente - System Design

## Architecture Overview

**Backend**: FastAPI server with WebSocket support
**Frontend**: React applications (4 different client types)
**Communication**: Room-based WebSocket connections
**Session Management**: UUID-based game rooms

## System Components

### Server (FastAPI)
- WebSocket connection manager for real-time communication
- Room-based session management using UUIDs
- Game state management and validation
- API key authentication for controller access
- Word database management

### Client Types

#### 1. Controller Client
- **Displays**: Target word, timer, game statistics, all controls
- **Controls**: Start/stop game, reset, manual point adjustment, word progression
- **Authentication**: Requires API key to generate/access game sessions
- **Special access**: Can override any game state

#### 2. Word Giver Clients (2x)
- **Displays**: Target word, timer, team statistics (points, correct/incorrect guesses)
- **Controls**: "Passo" button to skip current word (game stops. the controller must start again)

#### 3. Word Guesser Client  
- **Displays**: Timer, team statistics (points, correct/incorrect guesses)
- **Controls**: "Stop" button to trigger guess phase
- **Special feature**: 5-second countdown screen after stop button pressed for guessing the word

## Game Flow States

1. **Lobby**: Waiting for all clients to connect
2. **Ready**: All clients connected, controller can start
3. **Playing**: Active round with timer running
4. **Guessing**: Word guesser triggered stop, 5s countdown active
5. **Paused**: Game temporarily stopped
6. **Ended**: Round/game completed

## WebSocket Message Types

### Client → Server
```
- connect: {type: "word_giver_1"|"word_giver_2"|"word_guesser"|"controller", uuid: string, api_key?: string}
- start_game: {} (controller only)
- stop_game: {} (controller only)  
- pass_word: {} (word givers only)
- request_guess: {} (word guesser only)
- adjust_points: {points: number} (controller only)
- reset_game: {} (controller only)
```

### Server → Client
```
- game_state: {state: string, target_word?: string, timer: number, stats: object}
- countdown: {seconds: number} (all clients)
- error: {message: string}
- connection_status: {connected_clients: array}
```

## Data Models

### Game Session
```
- uuid: string
- state: enum
- target_word: string
- timer: number
- stats: {correct: number, incorrect: number, total_points: number}
- connected_clients: array
- current_word_index: number
```

### Client Connection
```
- client_id: string
- client_type: enum
- session_uuid: string
- connected_at: timestamp
```

## Security Considerations

- API key validation for controller access
- UUID-based session isolation
- WebSocket connection validation
- Rate limiting on actions

## Static Timer Implementation

Clients maintain static timer display that only updates when server broadcasts new timer values. No client-side countdown logic to ensure synchronization.

## File System Structure

```
sessions/
├── {uuid}/
│   ├── words.json          # Available words for session
│   └── used_words.json     # Already used words
```

**Word Selection**: Current word = random from (words.json - used_words.json)

## Game Rules

- **Timer**: 60 seconds default, controller can adjust ±seconds
- **Scoring**: +1 correct guess, -1 wrong/mistakes, 0 for pass
- **Word Flow**: New word picked when controller presses start
- **Game Control**: Stop button pauses until controller restarts

## Authentication

- **API Key**: Environment variable validation for controller access
- **Session Access**: UUID-only for other clients

## Connection Handling

- **Disconnections**: Game continues, show warning indicator
- **Network**: Supports both local network play (official games) and online play (practice/training)