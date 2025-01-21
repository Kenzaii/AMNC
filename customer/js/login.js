// Add Airtable Configuration at the top
const AIRTABLE_URL = 'https://api.airtable.com/v0';
const BASE_ID = 'appipp8LFUGElp3Di';
const API_KEY = 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542';

// Function to completely clear all browser storage
function clearAllStorage() {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Clear any cached data
    if (window.caches) {
        caches.keys().then(names => {
            names.forEach(name => {
                caches.delete(name);
            });
        });
    }
    
    console.log('Cleared all browser storage');
}

// Make handleLogin function globally accessible
window.handleLogin = async function(event) {
    event.preventDefault();
    
    clearAllStorage();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    console.log('Login attempt for:', username);

    try {
        const response = await fetch(`${AIRTABLE_URL}/${BASE_ID}/Users`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Cache-Control': 'no-cache'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }

        const allUsers = await response.json();
        console.log('Available fields in Users table:', 
            allUsers.records[0] ? Object.keys(allUsers.records[0].fields) : []
        );

        const user = allUsers.records.find(record => 
            record.fields.Username?.toLowerCase() === username.toLowerCase()
        );

        if (user) {
            console.log('Found user record:', {
                id: user.id,
                availableFields: Object.keys(user.fields),
                username: user.fields.Username,
                customerId: user.fields['Customer ID'],
                role: user.fields.Role
            });
            
            if (user.fields.Password === password) {
                const userInfo = {
                    username: user.fields.Username,
                    customerId: user.fields['Customer ID'], // Use exact field name
                    userRole: user.fields.Role || 'customer',
                    userId: user.id
                };
                
                console.log('About to store user info:', userInfo);

                // Store in localStorage
                Object.entries(userInfo).forEach(([key, value]) => {
                    if (value) {
                        localStorage.setItem(key, value);
                        console.log(`Stored ${key}:`, value);
                    }
                });

                console.log('Final localStorage state:', { ...localStorage });

                const redirectPath = userInfo.userRole.toLowerCase() === 'admin' 
                    ? 'admin/dashboard.html' 
                    : 'customer/dashboard.html';
                
                console.log('Redirecting to:', redirectPath);
                window.location.replace(redirectPath);
                return;
            } else {
                alert('Invalid password');
            }
        } else {
            alert('User not found');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
};

// Helper function for debug logging
function debugLog(message, data = null) {
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo) {
        debugInfo.style.display = 'block';
        const pre = debugInfo.querySelector('pre');
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}\n${data ? JSON.stringify(data, null, 2) : ''}`;
        pre.textContent += logMessage + '\n';
        console.log(message, data);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Clear all storage on page load
    clearAllStorage();
    
    // Add form submit handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', window.handleLogin);
        debugLog('Login form handler attached');
    }
});

// Add event listener for page unload
window.addEventListener('beforeunload', () => {
    // Clear storage when leaving the login page without successful login
    if (!localStorage.getItem('username')) {
        clearAllStorage();
    }
});

// Update the getDashboardPath function
function getDashboardPath(userRole) {
    const isFileProtocol = window.location.protocol === 'file:';
    
    if (isFileProtocol) {
        // For file:// protocol
        const currentPath = decodeURIComponent(window.location.pathname);
        const pathParts = currentPath.split('/');
        const rootIndex = pathParts.findIndex(part => part === 'OrderSys-main');
        
        if (rootIndex !== -1) {
            // Reconstruct the path to the dashboard
            const baseParts = pathParts.slice(0, rootIndex + 1);
            const dashboardPath = [...baseParts, userRole, 'dashboard.html'].join('/');
            console.log('Constructed dashboard path:', dashboardPath);
            return 'file:///' + dashboardPath.replace(/^\//, '');
        }
    }
    
    // For http:// protocol
    const currentUrl = new URL(window.location.href);
    const baseUrl = currentUrl.origin + currentUrl.pathname.split('login.html')[0];
    return baseUrl + `${userRole}/dashboard.html`;
}

// Add this at the top of the file
function dumpState(label) {
    console.group(label);
    console.log('localStorage:', { ...localStorage });
    console.log('sessionStorage:', { ...sessionStorage });
    console.log('Current URL:', window.location.href);
    console.log('Current Path:', window.location.pathname);
    console.log('Protocol:', window.location.protocol);
    console.groupEnd();
}

// Add role mapping helper
function mapUserRole(airtableRole) {
    // Map Airtable roles to application roles
    switch (airtableRole?.toLowerCase()) {
        case 'admin':
            return 'admin';
        case 'user':
        case 'customer':
        case null:
        case undefined:
            return 'customer';
        default:
            return 'customer';
    }
} 