document.addEventListener('DOMContentLoaded', function() {
    // Pricing toggle functionality
    const billingToggle = document.getElementById('billingToggle');
    const prices = document.querySelectorAll('.price .amount');
    
    // Original monthly prices
    const monthlyPrices = ['0', '19', '49'];
    // Annual prices (20% discount applied)
    const annualPrices = ['0', '15', '39'];
    
    if (billingToggle) {
        billingToggle.addEventListener('change', function() {
            const isAnnual = this.checked;
            
            // Update price display
            prices.forEach((price, index) => {
                price.textContent = isAnnual ? annualPrices[index] : monthlyPrices[index];
            });
            
            // Update period text
            document.querySelectorAll('.price .period').forEach(period => {
                period.textContent = isAnnual ? '/month (billed annually)' : '/month';
            });
        });
    }
});