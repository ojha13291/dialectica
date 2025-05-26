document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const alertContainer = document.getElementById('alert-container');

  const token = localStorage.getItem('dialectica_token');
  if (token) {
    window.location.href = 'index.html';
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    hideAlert();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Special admin access check
    if (password === '9006' && (email === 'dialectica91@gmail.com' || email === 'ojha13291@gmail.com' || email === 'Johnripper579@gmail.com')) {
      // Create a temporary admin token
      const tempAdminToken = 'admin_' + Date.now();
      localStorage.setItem('dialectica_token', tempAdminToken);
      
      // Create admin user object
      const adminUser = {
        email: email,
        username: email.split('@')[0],
        isAdmin: true
      };
      localStorage.setItem('dialectica_user', JSON.stringify(adminUser));
      
      // Redirect to admin dashboard
      window.location.href = 'admin.html';
      return;
    }
    
    try {
      const apiBaseUrl = 'https://dialectica.onrender.com';
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response) {
        showAlert('Network error. Please try again.', 'danger');
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        showAlert(data.msg || 'Login failed. Please check your credentials.', 'danger');
        return;
      }
      
      if (!data.token || !data.user || !data.user.id || !data.user.username) {
        showAlert('Invalid user data received from server', 'danger');
        return;
      }
      
      localStorage.setItem('dialectica_token', data.token);
      localStorage.setItem('dialectica_user', JSON.stringify(data.user));
      
      console.log('User data from server:', data.user);
      console.log('Is admin?', data.user.isAdmin);
      
      showAlert('Login successful! Redirecting...', 'success');
      
      const redirectTarget = localStorage.getItem('dialectica_redirect');
      
      setTimeout(() => {
        const userStr = localStorage.getItem('dialectica_user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            
            if (user.email === 'dialectica91@gmail.com' || user.email === 'ojha13291@gmail.com' || user.email === 'Johnripper579@gmail.com') {
          
              user.isAdmin = true;
              localStorage.setItem('dialectica_user', JSON.stringify(user));
              console.log('Admin status set to true for:', user.email);
              
              window.location.href = 'admin.html';
              return;
            }
          } catch (err) {
            console.error('Error parsing user data:', err);
          }
        }
        
    
        if (redirectTarget) {
          localStorage.removeItem('dialectica_redirect'); 
          window.location.href = redirectTarget;
        } else {
          window.location.href = 'dashboard.html';
        }
      }, 1500);
    } catch (err) {
      console.error('Login error:', err);
      showAlert('An error occurred during login. Please try again.', 'danger');
    }
  });
  
  function showAlert(message, type = 'danger') {
    alertContainer.innerHTML = `<div class="alert alert-${type}" role="alert">${message}</div>`;
    alertContainer.style.display = 'block';
  }
  
  function hideAlert() {
    alertContainer.innerHTML = '';
    alertContainer.style.display = 'none';
  }
});
