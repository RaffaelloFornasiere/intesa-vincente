import React, { useState, useEffect } from 'react';
import './App.css';
import { getLocalIP } from './utils/network';
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
  };

  const renderCurrentInterface = () => {
    if (!currentRole) {
      return <LoginScreen onLogin={handleLogin} localIP={localIP} />;
    }

    switch (currentRole) {
      case 'controller':
        return <Controller apiKey={apiKey} localIP={localIP} />;
      case 'word_giver_1':
      case 'word_giver_2':
        return <WordGiver sessionUuid={sessionUuid} clientType={currentRole} localIP={localIP} />;
      case 'word_guesser':
        return <WordGuesser sessionUuid={sessionUuid} localIP={localIP} />;
      default:
        return <LoginScreen onLogin={handleLogin} localIP={localIP} />;
    }
  };


  // Auto-detect local IP on component mount
  useEffect(() => {
    getLocalIP().then(ip => {
      console.log('Detected local IP:', ip);
      setLocalIP(ip);
    });
  }, []);

  return renderCurrentInterface();
}

export default App;