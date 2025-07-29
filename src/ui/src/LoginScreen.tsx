import React, { useState } from 'react';
import './App.css';
import { getBaseURL } from './utils/network';

export type ClientRole = 'controller' | 'word_giver_1' | 'word_giver_2' | 'word_guesser';

interface LoginScreenProps {
  onLogin: (role: ClientRole, sessionUuid: string, apiKey?: string) => void;
  localIP: string;
}

function LoginScreen({ onLogin, localIP }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<ClientRole>('controller');
  const [sessionUuid, setSessionUuid] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleLogin = () => {
    setError('');

    if (selectedRole === 'controller') {
      if (!apiKey) {
        setError('La API key è richiesta per il Controllore');
        return;
      }
      // For controller, we'll create a new session
      onLogin(selectedRole, '', apiKey);
    } else {
      if (!sessionUuid) {
        setError('Il codice sessione è richiesto');
        return;
      }
      onLogin(selectedRole, sessionUuid);
    }
  };

  const getRoleDisplayName = (role: ClientRole): string => {
    switch (role) {
      case 'controller': return 'Controllore';
      case 'word_giver_1': return 'Suggeritore 1';
      case 'word_giver_2': return 'Suggeritore 2';
      case 'word_guesser': return 'Indovinatore';
    }
  };

  const getRoleDescription = (role: ClientRole): string => {
    switch (role) {
      case 'controller': return 'Gestisce il gioco, vede la parola obiettivo, controlla il timer e il punteggio';
      case 'word_giver_1': return 'Dà indizi per aiutare l\'indovinatore, vede la parola obiettivo e il timer';
      case 'word_giver_2': return 'Dà indizi per aiutare l\'indovinatore, vede la parola obiettivo e il timer';
      case 'word_guesser': return 'Indovina la parola obiettivo basandosi sugli indizi, vede il timer e può fermare il gioco';
    }
  };

  return (
    <div className="login-screen">
      <h1>Intesa Vincente</h1>
      <p>Seleziona il tuo ruolo per entrare nel gioco</p>
      
      {error && <div className="error">{error}</div>}
      
      <div className="server-info">
        Server: {getBaseURL(localIP)}
      </div>

      <div className="role-selection">
        <h3>Seleziona il Tuo Ruolo</h3>
        {(['controller', 'word_giver_1', 'word_giver_2', 'word_guesser'] as ClientRole[]).map((role) => (
          <div key={role} className="role-option">
            <label className="role-label">
              <input
                type="radio"
                value={role}
                checked={selectedRole === role}
                onChange={(e) => setSelectedRole(e.target.value as ClientRole)}
              />
              <div className="role-info">
                <div className="role-name">{getRoleDisplayName(role)}</div>
                <div className="role-description">{getRoleDescription(role)}</div>
              </div>
            </label>
          </div>
        ))}
      </div>

      <div className="login-form">
        {selectedRole === 'controller' ? (
          <div className="form-group">
            <label>Chiave API (richiesta per il Controllore)</label>
            <input
              type="text"
              placeholder="Inserisci l'API-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <small>Il Controllore crea una nuova sessione di gioco</small>
          </div>
        ) : (
          <div className="form-group">
            <label>Codice Sessione (ottienilo dal Controllore)</label>
            <input
              type="text"
              placeholder="Inserisci Codice Sessione"
              value={sessionUuid}
              onChange={(e) => setSessionUuid(e.target.value)}
            />
            <small>Unisciti a una sessione di gioco esistente</small>
          </div>
        )}
      </div>

      <button onClick={handleLogin} className="login-btn">
        {selectedRole === 'controller' ? 'Crea Sessione' : 'Unisciti alla Sessione'}
      </button>
    </div>
  );
}

export default LoginScreen;