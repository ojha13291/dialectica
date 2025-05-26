const config = {
  // Actual Vercel deployment URL
  apiBaseUrl: 'https://dialectica-seven.vercel.app',
  
  socketUrl: 'https://dialectica-seven.vercel.app',
  
  // Socket.io connection options for Vercel compatibility
  socketOptions: {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000
  }
};

window.appConfig = config;
