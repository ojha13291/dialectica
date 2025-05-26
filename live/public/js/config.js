// Configuration for API endpoints
const config = {
  // Base URL for API requests - automatically detects environment
  apiBaseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://dialectica.onrender.com',
  
  // Socket.IO connection URL
  socketUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://dialectica.onrender.com'
};

// Make config available globally
window.appConfig = config;
