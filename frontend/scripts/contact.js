document.addEventListener('DOMContentLoaded', function() {
    // Contact form submission
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form values
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            const newsletter = document.getElementById('newsletter').checked;
            
            // Validate form
            if (!name || !email || !message) {
                showAlert('Please fill in all required fields', 'danger');
                return;
            }
            
            // In a real implementation, you would send this data to your server
            // For demo purposes, we'll just show a success message
            
            // Clear form
            contactForm.reset();
            
            // Show success message
            showAlert('Your message has been sent successfully! We will get back to you soon.', 'success');
        });
    }
    
    // Helper function to show alerts
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} mt-3`;
        alertDiv.textContent = message;
        
        const form = document.querySelector('form');
        form.parentNode.insertBefore(alertDiv, form);
        
        // Remove alert after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
});