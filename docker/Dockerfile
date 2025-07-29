# Multi-stage build
FROM node:18-alpine AS frontend-builder

# Build React frontend
WORKDIR /app/frontend
COPY src/ui/package*.json ./
RUN npm ci --only=production
COPY src/ui/ ./
RUN npm run build

# Python backend stage
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY src/game/ ./src/game/
COPY words.json .

# Copy built React app from frontend stage
COPY --from=frontend-builder /app/frontend/build ./src/ui/build

# Create sessions directory
RUN mkdir -p sessions

# Expose port 9898
EXPOSE 9898

# Run the application on port 9898
CMD ["python", "-c", "import uvicorn; from src.game.server import app; uvicorn.run(app, host='0.0.0.0', port=9898)"]