// Configuration for API endpoints
// IMPORTANT: After deploying to Render, replace 'your-app-name.onrender.com' with your actual Render URL
const config = {
  // Base URL for API requests - automatically detects environment
  apiBaseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000' 
    : 'https://your-app-name.onrender.com',
  
  // Socket.IO connection URL
  socketUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://your-app-name.onrender.com'
};

// Make config available globally
window.appConfig = config;
