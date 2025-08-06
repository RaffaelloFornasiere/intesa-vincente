import React, { useState, useEffect } from 'react';
import './App.css';
import { getLocalIP } from './utils/network';
import { loadSession, saveSession, clearSession } from './utils/session';
import LoginScreen, { ClientRole } from './LoginScreen';
import Controller from './Controller';
import WordGiver from './WordGiver';
import WordGuesser from './WordGuesser';

function App() {
  const [currentRole, setCurrentRole] = useState<ClientRole | null>(null);
  const [sessionUuid, setSessionUuid] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [localIP, setLocalIP] = useState<string>('localhost');

  const handleLogin = (role: ClientRole, uuid: string, key?: string) => {
    setCurrentRole(role);
    setSessionUuid(uuid);
    if (key) {
      setApiKey(key);
    }
    // Save to localStorage (for controller, uuid will be updated later from server response)
    saveSession(role, uuid, key);
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
  }, []);

  return renderCurrentInterface();
}

export default App;