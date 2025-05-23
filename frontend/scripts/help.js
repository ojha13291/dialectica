document.addEventListener('DOMContentLoaded', function() {
    // Help center search functionality
    const searchForm = document.querySelector('.help-search-form');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchInput = this.querySelector('input').value.trim();
            
            if (searchInput) {
                // In a real implementation, you would redirect to search results
                // For demo purposes, we'll just show an alert
                alert(`You searched for: "${searchInput}"\n\nIn a real implementation, this would show search results.`);
            }
        });
    }
    
    // Video tutorial play button functionality
    const playButtons = document.querySelectorAll('.play-button');
    
    playButtons.forEach(button => {
        button.addEventListener('click', function() {
            const videoTitle = this.closest('.video-card').querySelector('h4').textContent;
            
            // In a real implementation, you would open a video player
            // For demo purposes, we'll just show an alert
            alert(`Playing video: "${videoTitle}"\n\nIn a real implementation, this would open a video player.`);
        });
    });
});