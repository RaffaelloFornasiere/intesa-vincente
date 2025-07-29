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

interface WordGiverProps {
  sessionUuid: string;
  clientType: 'word_giver_1' | 'word_giver_2';
  localIP: string;
}

function WordGiver({ sessionUuid, clientType, localIP }: WordGiverProps) {
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    connectToSession();
  }, []);

  const connectToSession = () => {

    const ws = new WebSocket(getWebSocketURL(localIP, sessionUuid));
    
    ws.onopen = () => {
      setConnectionStatus('connected');
      setError('');
      
      // Send connection message with client type
      ws.send(JSON.stringify({
        type: 'connect',
        client_type: clientType,
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

  const passWord = () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log('Passing word...');
      websocket.send(JSON.stringify({ type: 'pass_word' }));
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
        <h1>Intesa Vincente - Suggeritore</h1>
        
        {error && <div className="error">{error}</div>}
        
        <div className="status">
          Connessione: <span className={connectionStatus}>{connectionStatus === 'connected' ? 'connesso' : connectionStatus === 'disconnected' ? 'disconnesso' : 'errore'}</span>
          <br />
          Server: {getBaseURL(localIP)}
        </div>

        {connectionStatus === 'connected' && sessionData ? (
          <div className="word-giver-panel">
            <h2>Sessione: {sessionUuid}</h2>
            <h3>Giocando come: {clientType === 'word_giver_1' ? 'SUGGERITORE 1' : 'SUGGERITORE 2'}</h3>
            
            {sessionData && (
              <div className="game-display">
                <div className="game-status">
                  <p>Stato: <span className={`status-${sessionData.state}`}>{sessionData.state === 'playing' ? 'in gioco' : sessionData.state === 'paused' ? 'in pausa' : sessionData.state === 'guessing' ? 'indovinando' : sessionData.state}</span></p>
                  <p className="timer">
                    Timer: <span className={sessionData.timer <= 10 ? 'timer-warning' : ''}>{sessionData.timer}s</span>
                  </p>
                </div>

                {sessionData.current_word && (
                  <div className="current-word-display">
                    <h2 className="target-word">{sessionData.current_word}</h2>
                  </div>
                )}

                <div className="word-giver-controls">
                  <button 
                    onClick={passWord} 
                    className="pass-btn"
                    disabled={sessionData.state === 'playing'}
                  >
                    Passo
                  </button>
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
            )}
          </div>
        ) : (
          <div>Connettendo alla sessione {sessionUuid} come {clientType === 'word_giver_1' ? 'SUGGERITORE 1' : 'SUGGERITORE 2'}...</div>
        )}
      </header>
    </div>
  );
}

export default WordGiver;