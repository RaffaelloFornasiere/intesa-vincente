import React, { useState, useEffect } from 'react';
import './App.css';
import { getLocalIP, getBaseURL } from './utils/network';
import { loadSession, saveSession, clearSession } from './utils/session';
import LoginScreen, { ClientRole } from './LoginScreen';
import Controller from './Controller';
import WordGiver from './WordGiver';
import WordGuesser from './WordGuesser';
import Overlay from './Overlay';

function App() {
  // Check if we're on the overlay route
  const isOverlay = window.location.pathname === '/overlay';
  
  const [currentRole, setCurrentRole] = useState<ClientRole | null>(null);
  const [sessionUuid, setSessionUuid] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [localIP, setLocalIP] = useState<string>('localhost');

  const handleLogin = async (role: ClientRole, uuid: string, key?: string) => {
    setCurrentRole(role);
    setSessionUuid(uuid);
    if (key) {
      setApiKey(key);
    }
    
    // Handle controller rejoining existing session
    if (role === 'controller' && uuid && key) {
      // Controller wants to rejoin an existing session
      try {
        const response = await fetch(`${getBaseURL(localIP)}/join-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            api_key: key,
            session_code: uuid 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          alert(`Failed to rejoin session: ${errorData.detail || 'Unknown error'}`);
          return;
        }

        const data = await response.json();
        setSessionUuid(data.session_uuid);
        saveSession(role, data.session_uuid, key);
      } catch (err) {
        alert(`Failed to rejoin session: ${(err as Error).message}`);
        return;
      }
    } else if (uuid) {
      // Non-controller clients or already validated session
      saveSession(role, uuid, key);
    }
    // For controller creating new session, UUID will be saved later
  };

  const handleLeaveSession = () => {
    setCurrentRole(null);
    setSessionUuid('');
    setApiKey('');
    clearSession();
  };

  // Function to update session UUID (for controller after session creation)
  const updateSessionUuid = (uuid: string) => {
    setSessionUuid(uuid);
    if (currentRole && uuid) {
      saveSession(currentRole, uuid, apiKey || undefined);
    }
  };

  const renderCurrentInterface = () => {
    if (!currentRole) {
      return <LoginScreen onLogin={handleLogin} localIP={localIP} />;
    }

    switch (currentRole) {
      case 'controller':
        return <Controller apiKey={apiKey} localIP={localIP} sessionUuid={sessionUuid} onLeaveSession={handleLeaveSession} onSessionCreated={updateSessionUuid} />;
      case 'word_giver_1':
      case 'word_giver_2':
        return <WordGiver sessionUuid={sessionUuid} clientType={currentRole} localIP={localIP} onLeaveSession={handleLeaveSession} />;
      case 'word_guesser':
        return <WordGuesser sessionUuid={sessionUuid} localIP={localIP} onLeaveSession={handleLeaveSession} />;
      default:
        return <LoginScreen onLogin={handleLogin} localIP={localIP} />;
    }
  };


  // Auto-detect local IP and restore session on component mount
  useEffect(() => {
    getLocalIP().then(ip => {
      console.log('Detected local IP:', ip);
      setLocalIP(ip);
    });

    // Don't restore session for overlay route
    if (!isOverlay) {
      // Try to restore session from localStorage
      const savedSession = loadSession();
      if (savedSession) {
        console.log('Restoring session:', savedSession);
        setCurrentRole(savedSession.role);
        setSessionUuid(savedSession.sessionUuid);
        if (savedSession.apiKey) {
          setApiKey(savedSession.apiKey);
        }
      }
    }
  }, []);

  // Show overlay if on /overlay route
  if (isOverlay) {
    return <Overlay />;
  }

  return renderCurrentInterface();
}

export default App;