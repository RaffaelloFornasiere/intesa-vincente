import React, { useState, useEffect } from 'react';
import './App.css';
import { getLocalIP, getBaseURL, getWebSocketURL } from './utils/network';

interface SessionData {
  uuid: string;
  state: string;
  connected_clients: string[];
  timer: number;
  stats: {
    correct: number;
    incorrect: number;
    total_points: number;
  };
  current_word: string | null;
}

interface WebSocketMessage {
  type: string;
  session?: SessionData;
  error?: string;
  message?: string;
  client_type?: string;
  session_uuid?: string;
  timer?: number;
  seconds?: number;
}

function App() {
  const [apiKey, setApiKey] = useState<string>('');
  const [sessionUuid, setSessionUuid] = useState<string>('');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string>('');
  const [localIP, setLocalIP] = useState<string>('localhost');

  const createSession = async () => {
    if (!apiKey) {
      setError('API key is required');
      return;
    }

    try {
      const response = await fetch(`${getBaseURL(localIP)}/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json();
      setSessionUuid(data.session_uuid);
      setError('');
      
      // Auto-connect to WebSocket
      connectWebSocket(data.session_uuid);
    } catch (err) {
      setError('Failed to create session: ' + (err as Error).message);
    }
  };

  const connectWebSocket = (uuid: string) => {
    const ws = new WebSocket(getWebSocketURL(localIP, uuid));
    
    ws.onopen = () => {
      setConnectionStatus('connected');
      setError('');
    };

    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      
      if (data.type === 'session_state' && data.session) {
        setSessionData(data.session);
      } else if (data.type === 'test_response') {
        console.log('Test connection response:', data.message);
        setError(''); // Clear any previous errors
      } else if (data.type === 'timer_update' && data.timer !== undefined) {
        // Update timer in current session data
        setSessionData(prevData => {
          if (prevData && data.timer !== undefined) {
            return {...prevData, timer: data.timer};
          }
          return prevData;
        });
      } else if (data.error) {
        setError(data.error);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setConnectionStatus('error');
    };

    setWebsocket(ws);
  };

  const testConnection = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Sending test connection message...');
      websocket.send(JSON.stringify({ type: 'test_connection' }));
    } else {
      console.log('WebSocket not connected');
    }
  };

  const getSessionState = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Requesting session state...');
      websocket.send(JSON.stringify({ type: 'get_state' }));
    } else {
      console.log('WebSocket not connected');
    }
  };

  const startGame = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Starting game...');
      websocket.send(JSON.stringify({ type: 'start_game' }));
    }
  };

  const stopGame = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Stopping game...');
      websocket.send(JSON.stringify({ type: 'stop_game' }));
    }
  };

  const adjustTimer = (seconds: number) => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log(`Adjusting timer by ${seconds} seconds...`);
      websocket.send(JSON.stringify({ type: 'adjust_timer', seconds }));
    }
  };

  const markWordCorrect = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Marking word as correct...');
      websocket.send(JSON.stringify({ type: 'mark_word_correct' }));
    } else {
      console.log('WebSocket not connected for mark_word_correct');
    }
  };

  const markWordIncorrect = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Marking word as incorrect...');
      websocket.send(JSON.stringify({ type: 'mark_word_incorrect' }));
    } else {
      console.log('WebSocket not connected for mark_word_incorrect');
    }
  };


  const resetGame = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Resetting game...');
      websocket.send(JSON.stringify({ type: 'reset_game' }));
    } else {
      console.log('WebSocket not connected for reset_game');
    }
  };

  // Auto-detect local IP on component mount
  useEffect(() => {
    getLocalIP().then(ip => {
      console.log('Detected local IP:', ip);
      setLocalIP(ip);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [websocket]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Intesa Vincente - Controller</h1>
        
        {error && <div className="error">{error}</div>}
        
        <div className="status">
          Connection: <span className={connectionStatus}>{connectionStatus}</span>
          <br />
          Server: {getBaseURL(localIP)}
        </div>

        {!sessionUuid ? (
          <div className="session-creation">
            <h2>Create Session</h2>
            <input
              type="text"
              placeholder="Enter API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button onClick={createSession}>Create Session</button>
          </div>
        ) : (
          <div className="controller-panel">
            <h2>Session: {sessionUuid}</h2>
            
            <div className="controls">
              <button onClick={testConnection}>Test Connection</button>
              <button onClick={getSessionState}>Get State</button>
              <button 
                onClick={startGame} 
                className="start-btn"
                disabled={sessionData?.state === 'playing'}
              >
                Start Game
              </button>
              <button 
                onClick={stopGame} 
                className="stop-btn"
                disabled={sessionData?.state !== 'playing'}
              >
                Stop Game
              </button>
              <button onClick={resetGame} className="reset-btn">Reset Game</button>
            </div>

            <div className="timer-controls">
              <h4>Timer Controls</h4>
              <button onClick={() => adjustTimer(-10)} className="timer-btn">-10s</button>
              <button onClick={() => adjustTimer(-5)} className="timer-btn">-5s</button>
              <button onClick={() => adjustTimer(-1)} className="timer-btn">-1s</button>
              <button onClick={() => adjustTimer(1)} className="timer-btn">+1s</button>
              <button onClick={() => adjustTimer(5)} className="timer-btn">+5s</button>
              <button onClick={() => adjustTimer(10)} className="timer-btn">+10s</button>
            </div>

            {sessionData?.current_word && (
              <div className="word-controls">
                <h4>Word Actions</h4>
                <button 
                  onClick={markWordCorrect} 
                  className="word-btn correct-btn"
                  disabled={sessionData?.state === 'playing'}
                >
                  ✓ Correct (+1)
                </button>
                <button 
                  onClick={markWordIncorrect} 
                  className="word-btn incorrect-btn"
                  disabled={sessionData?.state === 'playing'}
                >
                  ✗ Incorrect (-1)
                </button>
              </div>
            )}

            {sessionData && (
              <div className="session-info">
                <h3>Game Status</h3>
                <p>State: <span className={`status-${sessionData.state}`}>{sessionData.state}</span></p>
                {sessionData.current_word && (
                  <p className="current-word">Current Word: <strong>{sessionData.current_word}</strong></p>
                )}
                <p className="timer">Timer: <span className={sessionData.timer <= 10 ? 'timer-warning' : ''}>{sessionData.timer}s</span></p>
                <p>Connected Clients: {sessionData.connected_clients.join(', ')}</p>
                <div className="stats">
                  <h4>Statistics</h4>
                  <p>Correct: {sessionData.stats.correct}</p>
                  <p>Incorrect: {sessionData.stats.incorrect}</p>
                  <p>Total Points: {sessionData.stats.total_points}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </div>
  );
}

export default App;