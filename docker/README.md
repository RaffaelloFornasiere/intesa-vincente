# Docker Deployment

Deploy Intesa Vincente on port 9898.

## Quick Start

1. **Build and run with Docker Compose:**
   ```bash
   cd docker
   docker-compose up -d
   ```

2. **Or build and run manually:**
   ```bash
   cd docker
   docker build -f Dockerfile -t intesa-vincente ..
   docker run -p 9898:9898 -e INTESA_API_KEY=your-key intesa-vincente
   ```

## Access

- **Application**: http://localhost:9898
- **API**: http://localhost:9898/create-session
- **WebSocket**: ws://localhost:9898/ws/{session}

## Environment Variables

- `INTESA_API_KEY`: Controller API key (default: "test-key-123")

## Volumes

- `../sessions:/app/sessions` - Session data persistence
- `../words.json:/app/words.json` - Game words database

## Health Check

The container includes health monitoring at port 9898.

## Stopping

```bash
docker-compose down
```