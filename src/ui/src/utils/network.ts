// Get local IP address (works in browser)
export const getLocalIP = (): Promise<string> => {
  return new Promise((resolve) => {
    // Default to localhost
    let localIP = 'localhost';
    
    // Try to get local IP via WebRTC
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    
    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) return;
      
      const candidate = ice.candidate.candidate;
      const ipMatch = candidate.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
      
      if (ipMatch && ipMatch[1] && ipMatch[1].startsWith('192.168.')) {
        localIP = ipMatch[1];
        pc.close();
        resolve(localIP);
      }
    };
    
    // Fallback after 3 seconds
    setTimeout(() => {
      pc.close();
      resolve(localIP);
    }, 3000);
  });
};

// Get base URL for API calls
export const getBaseURL = (ip: string = 'localhost') => {
  return `http://${ip}:8000`;
};

// Get WebSocket URL
export const getWebSocketURL = (ip: string = 'localhost', uuid: string) => {
  return `ws://${ip}:8000/ws/${uuid}`;
};