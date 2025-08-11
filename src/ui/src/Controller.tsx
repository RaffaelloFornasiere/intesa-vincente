import React, { useState, useEffect } from 'react';
import './App.css';
import { getBaseURL, getWebSocketURL } from './utils/network';

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
  pass_count?: number;
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

interface ControllerProps {
  apiKey: string;
  localIP: string;
  sessionUuid?: string;
  onLeaveSession: () => void;
  onSessionCreated: (uuid: string) => void;
}

function Controller({ apiKey, localIP, sessionUuid: initialSessionUuid, onLeaveSession, onSessionCreated }: ControllerProps) {
  const [sessionUuid, setSessionUuid] = useState<string>(initialSessionUuid || '');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string>('');

  useEffect(() => {
    if (initialSessionUuid) {
      // Existing session (rejoining) - just connect to WebSocket
      setSessionUuid(initialSessionUuid);
      connectWebSocket(initialSessionUuid);
    } else {
      // No existing session - create new one
      createSession();
    }
  }, []);

  const createSession = async () => {
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
      
      // Notify parent component about session creation
      onSessionCreated(data.session_uuid);
      
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
      
      // Send connection message with client type
      ws.send(JSON.stringify({
        type: 'connect',
        client_type: 'controller',
        session_uuid: uuid
      }));
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

  const copySessionCode = async () => {
    try {
      await navigator.clipboard.writeText(sessionUuid);
      setCopySuccess('Copiato!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = sessionUuid;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess('Copiato!');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

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
        <h1>Intesa Vincente - Controllore</h1>
        
        {error && <div className="error">{error}</div>}
        
        <div className="status">
          Connessione: <span className={connectionStatus}>{connectionStatus === 'connected' ? 'connesso' : connectionStatus === 'disconnected' ? 'disconnesso' : 'errore'}</span>
          <br />
          Server: {getBaseURL(localIP)}
        </div>

        {sessionUuid ? (
          <div className="controller-panel">
            <div className="session-header">
              <h2>Codice Sessione: {sessionUuid}</h2>
              <button onClick={copySessionCode} className="copy-btn">
                📋 {copySuccess || 'Copia'}
              </button>
            </div>
            <p className="session-share">Condividi questo codice con gli altri giocatori per entrare nel gioco</p>
            
            <div className="controls">
              <button 
                onClick={startGame} 
                className="start-btn"
                disabled={sessionData?.state === 'playing'}
              >
                Inizia Gioco
              </button>
              <button 
                onClick={stopGame} 
                className="stop-btn"
                disabled={sessionData?.state !== 'playing'}
              >
                Ferma Gioco
              </button>
              <button onClick={resetGame} className="reset-btn">Resetta Gioco</button>
              <button onClick={onLeaveSession} className="leave-session-btn">Lascia Sessione</button>
            </div>

            <div className="timer-controls">
              <h4>Controlli Timer</h4>
              <button onClick={() => adjustTimer(-10)} className="timer-btn">-10s</button>
              <button onClick={() => adjustTimer(-5)} className="timer-btn">-5s</button>
              <button onClick={() => adjustTimer(-1)} className="timer-btn">-1s</button>
              <button onClick={() => adjustTimer(1)} className="timer-btn">+1s</button>
              <button onClick={() => adjustTimer(5)} className="timer-btn">+5s</button>
              <button onClick={() => adjustTimer(10)} className="timer-btn">+10s</button>
            </div>

            {sessionData?.current_word && (
              <div className="word-controls">
                <h4>Azioni Parola</h4>
                <button 
                  onClick={markWordCorrect} 
                  className="word-btn correct-btn"
                  disabled={sessionData?.state === 'playing'}
                >
                  ✓ Corretto (+1)
                </button>
                <button 
                  onClick={markWordIncorrect} 
                  className="word-btn incorrect-btn"
                  disabled={sessionData?.state === 'playing'}
                >
                  ✗ Sbagliato (-1)
                </button>
              </div>
            )}

            {sessionData && (
              <div className="session-info">
                <h3>Stato Gioco</h3>
                <p>Stato: <span className={`status-${sessionData.state}`}>{sessionData.state === 'playing' ? 'in gioco' : sessionData.state === 'paused' ? 'in pausa' : sessionData.state === 'guessing' ? 'indovinando' : sessionData.state}</span></p>
                {sessionData.current_word && (
                  <p className="current-word">Parola Corrente: <strong>{sessionData.current_word}</strong></p>
                )}
                <p className="timer">Timer: <span className={sessionData.timer <= 10 ? 'timer-warning' : ''}>{sessionData.timer}s</span></p>
                <p>Passi Disponibili: {3 - (sessionData.pass_count || 0)}/3</p>
                <p>Client Connessi: {sessionData.connected_clients.join(', ')}</p>
                <div className="stats">
                  <h4>Statistiche</h4>
                  <p>Corrette: {sessionData.stats.correct}</p>
                  <p>Sbagliate: {sessionData.stats.incorrect}</p>
                  <p>Punti Totali: {sessionData.stats.total_points}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>Creando sessione...</div>
        )}
      </header>
    </div>
  );
}

export default Controller;