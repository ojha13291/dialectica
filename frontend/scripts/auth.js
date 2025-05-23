document.addEventListener('DOMContentLoaded', function() {
    // Login form handling
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Validate inputs
            if (!email || !password) {
                showAlert('Please fill in all fields', 'danger');
                return;
            }
            
            // Mock API call - In a real app, you'd make an actual API call to your backend
            mockLogin(email, password)
                .then(response => {
                    // Store token in localStorage
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                })
                .catch(error => {
                    showAlert(error, 'danger');
                });
        });
    }
    
    // Signup form handling
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('fullName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Validate inputs
            if (!fullName || !email || !password) {
                showAlert('Please fill in all fields', 'danger');
                return;
            }
            
            if (password.length < 6) {
                showAlert('Password must be at least 6 characters long', 'danger');
                return;
            }
            
            // Mock API call - In a real app, you'd make an actual API call to your backend
            mockSignup(fullName, email, password)
                .then(response => {
                    // Store token in localStorage
                    localStorage.setItem('authToken', response.token);
                    localStorage.setItem('user', JSON.stringify(response.user));
                    
                    // Redirect to dashboard
                    window.location.href = 'dashboard.html';
                })
                .catch(error => {
                    showAlert(error, 'danger');
                });
        });
    }
    
    // Google Sign In button
    const googleButtons = document.querySelectorAll('.google-btn');
    googleButtons.forEach(button => {
        button.addEventListener('click', function() {
            // In a real implementation, you would initialize the Google Sign-In API
            // and handle the authentication flow
            alert('Google Sign-In would be initiated here. This is a demo.');
        });
    });
    
    // Helper function to show alerts
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} mt-3`;
        alertDiv.textContent = message;
        
        const form = document.querySelector('form');
        form.parentNode.insertBefore(alertDiv, form.nextSibling);
        
        // Remove alert after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
    
    // Mock API functions (these would be replaced with actual API calls)
    function mockLogin(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate successful login
                if (email === 'demo@example.com' && password === 'password') {
                    resolve({
                        token: 'mock-jwt-token',
                        user: {
                            id: '123',
                            name: 'Demo User',
                            email: email
                        }
                    });
                } else {
                    reject('Invalid email or password');
                }
            }, 1000);
        });
    }
    
    function mockSignup(fullName, email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate successful signup
                resolve({
                    token: 'mock-jwt-token',
                    user: {
                        id: '123',
                        name: fullName,
                        email: email
                    }
                });
            }, 1000);
        });
    }
});