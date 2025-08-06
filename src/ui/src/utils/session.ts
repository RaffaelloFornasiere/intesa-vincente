import { ClientRole } from '../LoginScreen';

interface SessionData {
  role: ClientRole;
  sessionUuid: string;
  apiKey?: string;
}

export const saveSession = (role: ClientRole, sessionUuid: string, apiKey?: string): void => {
  const params = new URLSearchParams(window.location.search);
  params.set('role', role);
  params.set('session', sessionUuid);
  
  if (apiKey) {
    params.set('apiKey', apiKey);
  } else {
    params.delete('apiKey');
  }
  
  // Update URL without refreshing the page
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);
};

export const loadSession = (): SessionData | null => {
  try {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role');
    const sessionUuid = params.get('session');
    const apiKey = params.get('apiKey');
    
    // Validate the session data
    if (!role || !sessionUuid || !isValidRole(role)) {
      return null;
    }
    
    return {
      role,
      sessionUuid,
      ...(apiKey && { apiKey })
    };
  } catch (error) {
    console.error('Failed to load session from URL:', error);
    return null;
  }
};

export const clearSession = (): void => {
  // Remove session parameters from URL
  const params = new URLSearchParams(window.location.search);
  params.delete('role');
  params.delete('session');
  params.delete('apiKey');
  
  const newUrl = params.toString() 
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;
    
  window.history.replaceState({}, '', newUrl);
};

export const isValidRole = (role: string): role is ClientRole => {
  return ['controller', 'word_giver_1', 'word_giver_2', 'word_guesser'].includes(role);
};