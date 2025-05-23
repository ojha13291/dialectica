// API utility for Dialectica
// In public/scripts/api.js
// API utility for Dialectica
// API utility for Dialectica
const API_URL = 'http://localhost:5000/api'; // Explicitly point to your API server

// Helper for making API requests
async function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers['x-auth-token'] = token;
  }

  const config = {
    method,
    headers,
    mode: 'cors',
    credentials: 'include'
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    // Handle response
    if (!response.ok) {
      // Try to parse error as JSON
      try {
        const errorData = await response.json();
        // If errorData.errors is an array, join the messages
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const messages = errorData.errors.map(e => e.msg).join(' ');
          throw new Error(messages || 'Something went wrong');
        }
        throw new Error(errorData.msg || 'Something went wrong');
      } catch (jsonError) {
        // If parsing JSON fails, use status text
        throw new Error(response.statusText || 'Something went wrong');
      }
    }
    // Try to parse as JSON
    try {
      const responseData = await response.json();
      return responseData;
    } catch (jsonError) {
      // If not JSON, return text
      return await response.text();
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Rest of your API code...

// Rest of your API code...

// Auth API calls
const auth = {
  // Login user
  login: async (email, password) => {
    return apiRequest('/auth', 'POST', { email, password });
  },

  // Get current user
  getCurrentUser: async (token) => {
    return apiRequest('/auth', 'GET', null, token);
  },

  // Register user
  register: async (name, email, password) => {
    return apiRequest('/users', 'POST', { name, email, password });
  }
};

// Debates API calls
const debates = {
  // Get all debates
  getDebates: async (token, filter = '', page = 1, limit = 10) => {
    return apiRequest(`/debates?filter=${filter}&page=${page}&limit=${limit}`, 'GET', null, token);
  },

  // Get debate by ID
  getDebate: async (token, debateId) => {
    return apiRequest(`/debates/${debateId}`, 'GET', null, token);
  },

  // Create a debate
  createDebate: async (token, debateData) => {
    return apiRequest('/debates', 'POST', debateData, token);
  },

  // Update a debate
  updateDebate: async (token, debateId, debateData) => {
    return apiRequest(`/debates/${debateId}`, 'PUT', debateData, token);
  },

  // Delete a debate
  deleteDebate: async (token, debateId) => {
    return apiRequest(`/debates/${debateId}`, 'DELETE', null, token);
  },

  // Join a debate
  joinDebate: async (token, debateId, role, position, accessCode = null) => {
    return apiRequest(`/debates/${debateId}/join`, 'POST', { role, position, accessCode }, token);
  },

  // Leave a debate
  leaveDebate: async (token, debateId) => {
    return apiRequest(`/debates/${debateId}/leave`, 'POST', null, token);
  },

  // Start a debate
  startDebate: async (token, debateId) => {
    return apiRequest(`/debates/${debateId}/start`, 'POST', null, token);
  },

  // End a debate
  endDebate: async (token, debateId) => {
    return apiRequest(`/debates/${debateId}/end`, 'POST', null, token);
  },

  // Save debate transcript
  saveTranscript: async (token, debateId, transcript) => {
    return apiRequest(`/debates/${debateId}/transcript`, 'POST', { transcript }, token);
  }
};

// Judge API calls
const judges = {
  // Submit score
  submitScore: async (token, scoreData) => {
    return apiRequest('/judges/score', 'POST', scoreData, token);
  },

  // Get debate scores
  getDebateScores: async (token, debateId) => {
    return apiRequest(`/judges/scores/${debateId}`, 'GET', null, token);
  },

  // Submit feedback
  submitFeedback: async (token, feedbackData) => {
    return apiRequest('/judges/feedback', 'POST', feedbackData, token);
  },

  // Get debate feedback
  getDebateFeedback: async (token, debateId) => {
    return apiRequest(`/judges/feedback/${debateId}`, 'GET', null, token);
  }
};

// Export the API
const API = {
  auth,
  debates,
  judges
};

// Make it available globally
window.API = API;