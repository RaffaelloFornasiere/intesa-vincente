// Get local IP address (works in browser)
export const getLocalIP = (): Promise<string> => {
  return new Promise((resolve) => {
    // Check if we're in development and can detect the IP from the current URL
    const currentHost = window.location.hostname;
    
    // If we're already on a local network IP, use that
    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1' && 
        (currentHost.startsWith('192.168.') || currentHost.startsWith('10.') || currentHost.startsWith('172.'))) {
      console.log('Using current host IP:', currentHost);
      resolve(currentHost);
      return;
    }
    
    // Default to localhost for development
    let localIP = 'localhost';
    let resolved = false;
    
    // Try to get local IP via WebRTC
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {
      // WebRTC failed, use fallback
      if (!resolved) {
        resolved = true;
        pc.close();
        resolve(localIP);
      }
    });
    
    pc.onicecandidate = (ice) => {
      if (resolved || !ice || !ice.candidate || !ice.candidate.candidate) return;
      
      const candidate = ice.candidate.candidate;
      const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
      
      if (ipMatch && ipMatch[1] && 
          (ipMatch[1].startsWith('192.168.') || ipMatch[1].startsWith('10.') || ipMatch[1].startsWith('172.'))) {
        localIP = ipMatch[1];
        resolved = true;
        pc.close();
        console.log('Detected local IP via WebRTC:', localIP);
        resolve(localIP);
      }
    };
    
    // Fallback after 2 seconds
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        pc.close();
        console.log('Using fallback IP:', localIP);
        resolve(localIP);
      }
    }, 2000);
  });
};

// Get base URL for API calls
export const getBaseURL = (ip: string = 'localhost') => {
  // If we're running in production (served from same origin), use relative URLs
  if (window.location.port === '8000' || window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  // Development mode - use detected IP
  return `http://${ip}:8000`;
};

// Get WebSocket URL
export const getWebSocketURL = (ip: string = 'localhost', uuid: string) => {
  // If we're running in production (served from same origin), use same host
  if (window.location.port === '8000' || window.location.hostname !== 'localhost') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/${uuid}`;
  }
  // Development mode - use detected IP
  return `ws://${ip}:8000/ws/${uuid}`;
};