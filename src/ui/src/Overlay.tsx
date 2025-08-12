import React, { useState, useEffect } from 'react';
import './Overlay.css';

interface GameState {
  current_word: string;
  correct: number;
  incorrect: number;
  timer_value: number;
  game_state: string;
  countdown_value?: number;
}

const Overlay: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  
  // Get session code from URL parameter (e.g., /overlay?session=happy-cat-42)
  const urlParams = new URLSearchParams(window.location.search);
  const sessionCode = urlParams.get('session');

  useEffect(() => {
    if (!sessionCode) {
      console.error('No session code provided. Use /overlay?session=YOUR_SESSION_CODE');
      return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/${sessionCode}`);

    ws.onopen = () => {
      console.log('Overlay WebSocket connected to session:', sessionCode);
      setConnected(true);
      // Send connect message first
      ws.send(JSON.stringify({ 
        type: 'connect',
        client_type: 'overlay'
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Overlay received message:', data);
      
      if (data.type === 'session_state') {
        const session = data.session;
        console.log('Session state:', session);
        setGameState({
          current_word: session.current_word || '',
          correct: session.stats?.correct || 0,
          incorrect: session.stats?.incorrect || 0,
          timer_value: session.timer || 0,
          game_state: session.game_state || 'lobby',
          countdown_value: session.countdown_value
        });
      } else if (data.type === 'timer_update') {
        console.log('Timer update:', data.timer);
        setGameState(prev => prev ? { ...prev, timer_value: data.timer } : null);
      } else if (data.type === 'countdown') {
        console.log('Countdown:', data.seconds);
        setGameState(prev => prev ? { ...prev, countdown_value: data.seconds } : null);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionCode]);

  const points = gameState ? gameState.correct - gameState.incorrect : 0;
  const displayTimer = gameState?.countdown_value !== undefined ? 
    gameState.countdown_value : (gameState?.timer_value || 0);
  const currentWord = gameState?.current_word || '---';
  
  console.log('Overlay render - gameState:', gameState);
  console.log('Overlay render - points:', points, 'timer:', displayTimer, 'word:', currentWord);

  if (!sessionCode) {
    return (
      <div className="overlay-container">
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          color: 'black',
          fontSize: '24px',
          textAlign: 'center'
        }}>
          <p>No session code provided</p>
          <p>Use: /overlay?session=YOUR_SESSION_CODE</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay-container">
      <div className="overlay-bar">
        <div className="overlay-element points-element">
          <span className="overlay-value">{points}</span>
        </div>
        <div className="overlay-element word-element">
          <span className="overlay-value">{currentWord}</span>
        </div>
        <div className="overlay-element timer-element">
          <span className="overlay-value">{displayTimer}</span>
        </div>
      </div>
    </div>
  );
};

export default Overlay;