# Intesa Vincente - Minimal Implementation

## Setup

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Set API key (optional, defaults to "test-key-123")
export INTESA_API_KEY="your-secret-key"

# Run server
cd src/game
python -m server
```

### Frontend
```bash
# Install dependencies
cd src/ui
npm install

# Run development server
npm start
```

## Testing

1. Start the FastAPI server (http://localhost:8000)
2. Start the React app (http://localhost:3000)
3. Enter API key: `test-key-123` (or your custom key)
4. Click "Create Session" to generate UUID and connect WebSocket
5. Test connection and view session state

## Current Features

- ✅ Session creation with UUID and API key validation
- ✅ WebSocket connection management
- ✅ Basic controller UI
- ✅ Session state tracking
- ✅ File-based session storage structure

## Next Steps

- Add word loading and selection
- Implement game states and controls  
- Add other client types (word givers, guesser)
- Add timer functionality