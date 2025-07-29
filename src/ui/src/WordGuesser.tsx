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

interface WordGuesserProps {
  sessionUuid: string;
  localIP: string;
}

function WordGuesser({ sessionUuid, localIP }: WordGuesserProps) {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string>('');
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(5);

  useEffect(() => {
    const ws = new WebSocket(getWebSocketURL(localIP, sessionUuid));
    
    ws.onopen = () => {
      setConnectionStatus('connected');
      setError('');
      
      // Send connection message with client type
      ws.send(JSON.stringify({
        type: 'connect',
        client_type: 'word_guesser',
        session_uuid: sessionUuid
      }));
    };

    ws.onmessage = (event) => {
      const data: WebSocketMessage = JSON.parse(event.data);
      console.log('WebSocket message received:', data);
      
      if (data.type === 'session_state' && data.session) {
        setSessionData(data.session);
      } else if (data.type === 'timer_update' && data.timer !== undefined) {
        // Update timer in current session data
        setSessionData(prevData => {
          if (prevData && data.timer !== undefined) {
            return {...prevData, timer: data.timer};
          }
          return prevData;
        });
      } else if (data.type === 'countdown' && data.seconds !== undefined) {
        // Handle guess countdown
        setCountdownSeconds(data.seconds);
        if (data.seconds > 0) {
          setShowCountdown(true);
        } else {
          setShowCountdown(false);
        }
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

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [sessionUuid, localIP]);

  const stopGame = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Word guesser requesting stop...');
      websocket.send(JSON.stringify({ type: 'request_guess' }));
    }
  };

  if (showCountdown) {
    return (
      <div className="App">
        <header className="App-header">
          <div className="countdown-screen">
            <h1>Indovina la parola!</h1>
            <div className="countdown-timer">
              {countdownSeconds}
            </div>
            <p>Indovina la parola ad alta voce prima che scada il tempo!</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Intesa Vincente - Indovinatore</h1>
        
        {error && <div className="error">{error}</div>}
        
        <div className="status">
          Connessione: <span className={connectionStatus}>{connectionStatus === 'connected' ? 'connesso' : connectionStatus === 'disconnected' ? 'disconnesso' : 'errore'}</span>
          <br />
          Server: {getBaseURL(localIP)}
        </div>

        {connectionStatus === 'connected' && sessionData && (
          <div className="word-guesser-panel">
            <h2>Sessione: {sessionUuid}</h2>
            
            <div className="game-display">
              <div className="game-status">
                <p>Stato: <span className={`status-${sessionData.state}`}>{sessionData.state === 'playing' ? 'in gioco' : sessionData.state === 'paused' ? 'in pausa' : sessionData.state === 'guessing' ? 'indovinando' : sessionData.state}</span></p>
                <p className="timer">
                  Timer: <span className={sessionData.timer <= 10 ? 'timer-warning' : ''}>{sessionData.timer}s</span>
                </p>
              </div>

              <div className="word-guesser-controls">
                <button 
                  onClick={stopGame} 
                  className="stop-guess-btn"
                  disabled={sessionData.state !== 'playing'}
                >
                  Ferma e Indovina
                </button>
                <p className="instruction">
                  {sessionData.state === 'playing' 
                    ? 'Ascolta gli indizi e premi "Ferma e Indovina" quando conosci la parola!'
                    : 'Aspettando l\'inizio del gioco...'
                  }
                </p>
              </div>

              <div className="stats-display">
                <h4>Statistiche Squadra</h4>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Corrette:</span>
                    <span className="stat-value">{sessionData.stats.correct}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Sbagliate:</span>
                    <span className="stat-value">{sessionData.stats.incorrect}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Punti Totali:</span>
                    <span className="stat-value">{sessionData.stats.total_points}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default WordGuesser;