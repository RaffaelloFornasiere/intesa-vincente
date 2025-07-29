import React, { useState } from 'react';
import './App.css';

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
        setError('API key is required for Controller');
        return;
      }
      // For controller, we'll create a new session
      onLogin(selectedRole, '', apiKey);
    } else {
      if (!sessionUuid) {
        setError('Session UUID is required');
        return;
      }
      onLogin(selectedRole, sessionUuid);
    }
  };

  const getRoleDisplayName = (role: ClientRole): string => {
    switch (role) {
      case 'controller': return 'Controller';
      case 'word_giver_1': return 'Word Giver 1';
      case 'word_giver_2': return 'Word Giver 2';
      case 'word_guesser': return 'Word Guesser';
    }
  };

  const getRoleDescription = (role: ClientRole): string => {
    switch (role) {
      case 'controller': return 'Manages the game, sees target word, controls timer and scoring';
      case 'word_giver_1': return 'Gives word clues to help the guesser, sees target word and timer';
      case 'word_giver_2': return 'Gives word clues to help the guesser, sees target word and timer';
      case 'word_guesser': return 'Guesses the target word based on clues, sees timer and can stop the game';
    }
  };

  return (
    <div className="login-screen">
      <h1>Intesa Vincente</h1>
      <p>Select your role to join the game</p>
      
      {error && <div className="error">{error}</div>}
      
      <div className="server-info">
        Server: http://{localIP}:8000
      </div>

      <div className="role-selection">
        <h3>Select Your Role</h3>
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
            <label>API Key (required for Controller)</label>
            <input
              type="text"
              placeholder="Enter API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <small>Controller creates a new game session</small>
          </div>
        ) : (
          <div className="form-group">
            <label>Session UUID (get this from the Controller)</label>
            <input
              type="text"
              placeholder="Enter Session UUID"
              value={sessionUuid}
              onChange={(e) => setSessionUuid(e.target.value)}
            />
            <small>Join an existing game session</small>
          </div>
        )}
      </div>

      <button onClick={handleLogin} className="login-btn">
        {selectedRole === 'controller' ? 'Create Session' : 'Join Session'}
      </button>
    </div>
  );
}

export default LoginScreen;