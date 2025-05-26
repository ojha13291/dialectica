const config = {
  // Vercel deployment URL - update this after deployment with your actual URL
  apiBaseUrl: 'https://dialectica-vercel.vercel.app',
  
  socketUrl: 'https://dialectica-vercel.vercel.app',
  
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
