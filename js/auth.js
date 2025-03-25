// Check if user is already logged in
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = localStorage.getItem('currentUser');
    const userRole = localStorage.getItem('userRole');
    
    if (currentUser && userRole) {
        redirectBasedOnRole(userRole);
    }
    
    // Add Enter key support for login form
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        // Function to handle Enter key press
        const handleEnterKey = function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                document.getElementById('login-btn').click();
            }
        };
        
        // Add event listeners for Enter key on both input fields
        if (usernameInput) {
            usernameInput.addEventListener('keydown', handleEnterKey);
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('keydown', handleEnterKey);
        }
    }
});

// Login functionality
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

if (loginBtn) {
    loginBtn.addEventListener('click', function() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            loginError.textContent = 'Please enter both username and password';
            return;
        }
        
        // API call to check credentials
        fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.USERS}`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            const users = data.records;
            // First check if user exists and password matches
            const user = users.find(u => 
                u.fields.Username === username && 
                u.fields.Password === password
            );
            
            if (user) {
                // Now check if the account is disabled
                if (user.fields.IsDisabled) {
                    // If disabled, redirect to restricted page
                    localStorage.setItem('attemptedUsername', username);
                    window.location.href = 'restricted.html';
                    return;
                }
                
                // Account is active, proceed with login
                // Update last login time
                updateLastLogin(user.id);
                
                // Log access
                logAccess(user.id, 'Login', `User ${username} logged in`);
                
                // Store user info in localStorage
                const userRole = user.fields.Role.toLowerCase();
                localStorage.setItem('currentUser', JSON.stringify({
                    id: user.id,
                    username: user.fields.Username,
                    role: userRole,
                    customerName: user.fields.CustomerName || '',
                    bpCode: user.fields.BPCode || ''
                }));
                localStorage.setItem('userRole', userRole);
                
                // Redirect based on role
                redirectBasedOnRole(userRole);
            } else {
                loginError.textContent = 'Invalid username or password';
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            loginError.textContent = 'An error occurred during login';
        });
    });
}

// Guest login functionality
const guestLoginLink = document.getElementById('guest-login-link');
const guestModal = document.getElementById('guest-modal');
const closeModal = document.querySelector('.close');
const guestLoginBtn = document.getElementById('guest-login-btn');
const guestError = document.getElementById('guest-error');

if (guestLoginLink) {
    guestLoginLink.addEventListener('click', function(e) {
        e.preventDefault();
        guestModal.style.display = 'block';
    });
}

if (closeModal) {
    closeModal.addEventListener('click', function() {
        guestModal.style.display = 'none';
    });
}

window.addEventListener('click', function(event) {
    if (event.target === guestModal) {
        guestModal.style.display = 'none';
    }
});

if (guestLoginBtn) {
    guestLoginBtn.addEventListener('click', function() {
        const name = document.getElementById('guest-name').value;
        const number = document.getElementById('guest-number').value;
        const email = document.getElementById('guest-email').value;
        const company = document.getElementById('guest-company').value;
        
        if (!name || !number || !email || !company) {
            guestError.textContent = 'Please fill in all fields';
            return;
        }
        
        // Create guest login record
        fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.GUEST_LOGIN}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: {
                    GuestName: name,
                    GuestNumber: number,
                    GuestEmail: email,
                    GuestCompany: company,
                    LoginTime: new Date().toISOString()
                }
            })
        })
        .then(response => response.json())
        .then(data => {
            // Store guest info in localStorage
            localStorage.setItem('currentGuest', JSON.stringify({
                id: data.id,
                name: name,
                email: email,
                company: company,
                role: 'guest'
            }));
            localStorage.setItem('userRole', 'guest');
            
            // Log access
            logAccess(null, 'Guest Login', `Guest ${name} from ${company} logged in`, name, email, number);
            
            // Redirect to customer portal
            window.location.href = 'customer/index.html';
        })
        .catch(error => {
            console.error('Guest login error:', error);
            guestError.textContent = 'An error occurred during login';
        });
    });
}

// Helper functions
function updateLastLogin(userId) {
    fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.USERS}/${userId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                LastLogin: new Date().toISOString()
            }
        })
    })
    .catch(error => console.error('Error updating last login:', error));
}

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

function redirectBasedOnRole(role) {
    switch(role.toLowerCase()) {
        case 'admin':
            window.location.href = 'admin/user-accounts.html';
            break;
        case 'user':
        case 'guest':
            window.location.href = 'customer/index.html';
            break;
        case 'sub-admin':
            window.location.href = 'admin/order-history.html';
            break;
        default:
            loginError.textContent = 'Invalid user role';
    }
} 