// Common utility functions for the application

// Check if user is logged in and has the proper role
function checkAuth(requiredRoles) {
    const currentUser = localStorage.getItem('currentUser');
    const userRole = localStorage.getItem('userRole');
    
    if (!currentUser || !userRole) {
        window.location.href = '../index.html';
        return false;
    }
    
    if (requiredRoles && !requiredRoles.some(role => userRole.toLowerCase() === role.toLowerCase())) {
        window.location.href = '../index.html';
        return false;
    }
    
    return true;
}

// Handle logout
function logout() {
    // Log action
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const isGuest = localStorage.getItem('userRole') === 'Guest';
    
    if (isGuest && localStorage.getItem('currentGuest')) {
        const guest = JSON.parse(localStorage.getItem('currentGuest'));
        logAccess(null, 'Logout', `Guest ${guest.name} logged out`, guest.name, guest.email);
    } else if (user) {
        logAccess(user.id, 'Logout', `User ${user.username} logged out`);
    }
    
    // Clear local storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentGuest');
    localStorage.removeItem('userRole');
    localStorage.removeItem('cart');
    
    // Redirect to login page
    window.location.href = '../index.html';
}

// Log access to the system
function logAccess(userId, action, details, guestName = null, guestEmail = null, guestPhone = null) {
    fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.ACCESS_LOGS}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                UserID: userId || '',
                Action: action,
                Timestamp: new Date().toISOString(),
                Details: details,
                GuestName: guestName || '',
                GuestEmail: guestEmail || '',
                GuestPhone: guestPhone || ''
            }
        })
    })
    .catch(error => console.error('Error logging access:', error));
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Format currency
function formatCurrency(amount) {
    return '$' + parseFloat(amount).toFixed(2);
}

// Get current user info
function getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    const guestJson = localStorage.getItem('currentGuest');
    const role = localStorage.getItem('userRole');
    
    if (role === 'guest' && guestJson) {
        const guestData = JSON.parse(guestJson);
        guestData.role = role; // Add role to guest data
        return guestData;
    } else if (userJson) {
        try {
            const userData = JSON.parse(userJson);
            // Ensure role is included
            if (!userData.role && role) {
                userData.role = role;
            }
            return userData;
        } catch (e) {
            console.error('Error parsing user data:', e);
            return { username: 'Unknown User', role: role || 'unknown' };
        }
    }
    
    return { username: 'Unknown User', role: role || 'unknown' };
}

// Display notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Generate a unique ID
function generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9);
} 