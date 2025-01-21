// Utility functions for the admin dashboard

// Date formatting
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Input validation
function validateInput(input, type = 'text') {
    const patterns = {
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        phone: /^\+?[\d\s-]{10,}$/,
        price: /^\d+(\.\d{0,2})?$/
    };

    if (patterns[type]) {
        return patterns[type].test(input);
    }
    return input.length > 0;
}

// Error handler
function handleError(error, element) {
    console.error(error);
    if (element) {
        element.innerHTML = `
            <div class="alert alert-danger">
                ${error.message || 'An error occurred'}
            </div>
        `;
    } else {
        alert(error.message || 'An error occurred');
    }
} 