// Update login success handler
async function handleLoginSuccess(userData) {
    // Clear any existing session data
    sessionStorage.clear();
    
    // Store new session data
    sessionStorage.setItem('username', userData.fields.Username);
    sessionStorage.setItem('role', userData.fields.Role);
    sessionStorage.setItem('customerID', userData.fields.CustomerID || '');
    
    // Redirect based on role - use direct assignment
    if (userData.fields.Role === 'admin') {
        document.location = '../admin/dashboard.html';
    } else if (userData.fields.Role === 'customer') {
        document.location = '../customer/dashboard.html';
    }
}

// Update your login function
async function login(username, password) {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Users?filterByFormula=AND({Username}='${username}',{Password}='${password}')`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        const data = await response.json();
        console.log('Login response:', data); // Debug log

        if (data.records && data.records.length > 0) {
            const user = data.records[0];
            await handleLoginSuccess(user);
        } else {
            throw new Error('Invalid username or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    
    // Clear any existing sessions
    window.sessionStorage.removeItem('userSession');
    window.localStorage.removeItem('userSession');

    // Function to create access log with correct field names
    async function createAccessLog(userId, username, userType, status) {
        try {
            console.log('Creating access log:', { userId, username, userType, status });
            
            const accessLogData = {
                records: [{
                    fields: {
                        UserID: userId,
                        Action: `${userType} Login - ${status}`,
                        Timestamp: new Date().toISOString(),
                        Details: `User ${username} logged in as ${userType}. Status: ${status}`,
                        GuestName: username,
                        GuestEmail: document.getElementById('guestEmail')?.value || '',
                        GuestPhone: document.getElementById('guestContact')?.value || ''
                    }
                }]
            };
            
            console.log('Access log data:', accessLogData);
            
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/AccessLogs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(accessLogData)
            });

            const responseData = await response.json();
            console.log('Access log response:', responseData);

            if (!response.ok) {
                throw new Error(`Failed to create access log: ${responseData.error?.message || 'Unknown error'}`);
            }
            
            console.log('Access log created successfully');
            
        } catch (error) {
            console.error('Error in createAccessLog:', error);
            // Don't throw the error, just log it
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                userId,
                username,
                userType,
                status
            });
        }
    }

    // Get elements
    const loginForm = document.getElementById('loginForm');
    const guestButton = document.getElementById('guestOrderBtn');
    const modal = document.getElementById('guestModal');
    const closeBtn = document.querySelector('.close');
    const guestForm = document.getElementById('guestForm');

    console.log('Guest button found:', guestButton);
    console.log('Modal found:', modal);

    // Generate Guest ID
    function generateGuestID() {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 5);
        return `Guest-${timestamp}${random}`.toUpperCase();
    }

    // Handle guest button click
    guestButton.addEventListener('click', function(event) {
        event.preventDefault();
        console.log('Guest button clicked');
        modal.style.display = 'block';
    });

    // Handle modal close
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });

    // Handle click outside modal
    window.addEventListener('click', function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    });

    // Guest form submission handler
    guestForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        console.log('Guest form submitted');

        const guestId = 'Guest-' + Date.now().toString() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        const currentTime = new Date().toISOString();
        
        const guestData = {
            name: document.getElementById('guestName').value,
            number: document.getElementById('guestContact').value,
            company: document.getElementById('guestCompany').value,
            email: document.getElementById('guestEmail').value,
            guestId: guestId,
            loginTime: currentTime
        };

        try {
            // Create guest record
            const guestResponse = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/GuestLogin`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    records: [{
                        fields: {
                            GuestID: guestData.guestId,
                            GuestName: guestData.name,
                            GuestNumber: guestData.number,
                            GuestEmail: guestData.email,
                            GuestCompany: guestData.company,
                            LoginTime: guestData.loginTime
                        }
                    }]
                })
            });

            if (!guestResponse.ok) {
                const errorData = await guestResponse.json();
                throw new Error(`Failed to create guest record: ${errorData.error?.message || 'Unknown error'}`);
            }

            const guestResult = await guestResponse.json();
            console.log('Guest record created:', guestResult);

            // Create guest session matching exactly what dashboard expects
            const guestSession = {
                id: guestResult.records[0].id,
                fields: {
                    Username: guestData.name,
                    Role: 'Guest',
                    IsDisabled: false,
                    CustomerID: guestData.guestId,
                    CustomerName: guestData.company,
                    Contact: guestData.number,
                    Email: guestData.email,
                    Status: 'Active'
                },
                Username: guestData.name,
                Role: 'Guest',
                CustomerID: guestData.guestId,
                CustomerName: guestData.company,
                Contact: guestData.number,
                Email: guestData.email,
                Status: 'Active',
                IsDisabled: false
            };

            // Clear any existing sessions
            window.sessionStorage.clear();
            window.localStorage.clear();

            // Store guest session
            const sessionStr = JSON.stringify(guestSession);
            window.sessionStorage.setItem('userSession', sessionStr);
            window.localStorage.setItem('userSession', sessionStr);

            // Log access
            await createAccessLog(
                guestData.guestId,
                guestData.name,
                'Guest',
                'Success'
            );

            // Verify session was stored
            const storedSession = window.sessionStorage.getItem('userSession');
            console.log('Stored session:', storedSession);

            // Close modal
            modal.style.display = 'none';

            // Redirect to dashboard with absolute path
            const baseUrl = window.location.origin + window.location.pathname.split('login.html')[0];
            const dashboardUrl = baseUrl + 'customer/dashboard.html';
            console.log('Redirecting to:', dashboardUrl);
            window.location.href = dashboardUrl;

        } catch (error) {
            console.error('Error creating guest:', error);
            await createAccessLog(
                guestData.guestId,
                guestData.name,
                'Guest',
                'Failed'
            );
            alert(`Failed to create guest account: ${error.message}`);
        }
    });

    // Regular login handler
    loginForm.onsubmit = async function(event) {
        event.preventDefault();
        console.log('Form submitted');

        const username = document.getElementById('username')?.value;
        const password = document.getElementById('password')?.value;

        if (!username || !password) {
            return false;
        }

        try {
            console.log('Checking credentials and status...');
            
            const response = await fetch(
                `${window.AIRTABLE_URL}/${window.BASE_ID}/Users?filterByFormula=AND({Username}='${username}',{Password}='${password}')`,
                {
                    headers: {
                        'Authorization': `Bearer ${window.API_KEY}`
                    }
                }
            );

            const data = await response.json();
            
            if (!response.ok || !data.records || data.records.length === 0) {
                console.log('Invalid credentials, logging failed attempt');
                await createAccessLog(
                    username,
                    username,
                    'User',
                    'Failed - Invalid Credentials'
                );
                showLoginError('Invalid credentials');
                return false;
            }

            const user = data.records[0];
            console.log('User data:', user);

            // Check disabled status first
            if (user.fields.IsDisabled) {
                console.log('Account is disabled, logging attempt');
                await createAccessLog(
                    user.id,
                    user.fields.Username,
                    user.fields.Role || 'User',
                    'Failed - Account Disabled'
                );
                sessionStorage.setItem('restrictedUser', username);
                window.location.href = 'restricted.html';
                return false;
            }

            const sessionData = {
                id: user.id,
                fields: user.fields,
                Role: user.fields.Role,
                Username: user.fields.Username,
                CustomerID: user.fields.CustomerID,
                CustomerName: user.fields.CustomerName
            };

            const sessionStr = JSON.stringify(sessionData);
            window.sessionStorage.setItem('userSession', sessionStr);
            window.localStorage.setItem('userSession', sessionStr);

            // Log successful login using the working createAccessLog function
            console.log('Logging successful login');
            await createAccessLog(
                user.id,
                user.fields.Username,
                user.fields.Role || 'User',
                'Success'
            );

            // Redirect based on role
            if (user.fields.Role === 'Admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'customer/dashboard.html';
            }

        } catch (error) {
            console.error('Login error:', error);
            await createAccessLog(
                username,
                username,
                'User',
                'Failed - System Error'
            );
            showLoginError('Login failed');
        }

        return false;
    };
});

// Helper function to show errors
function showLoginError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}

// Helper function to check disabled status
function isDisabled(status) {
    return status === true || 
           status === 1 || 
           status === "true" || 
           status === "1" || 
           status === "yes";
}

// Add function to check if account is disabled
function checkDisabledStatus(value) {
    // Convert various forms of "true" to boolean
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || 
               value === '1' || 
               value.toLowerCase() === 'yes';
    }
    return Boolean(value);
}

// Add function to clear sessions
function clearSessions() {
    sessionStorage.removeItem('userSession');
    localStorage.removeItem('userSession');
}

// Add CSS for modal
const modalStyle = document.createElement('style');
modalStyle.textContent = `
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
    }
    .modal-content {
        background-color: #fefefe;
        margin: 15% auto;
        padding: 20px;
        border: 1px solid #888;
        width: 80%;
        max-width: 500px;
        border-radius: 5px;
    }
    .close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
    }
    .close:hover {
        color: black;
    }
    .form-group {
        margin-bottom: 15px;
    }
    .form-group label {
        display: block;
        margin-bottom: 5px;
    }
    .form-group input {
        width: 100%;
        padding: 8px;
        box-sizing: border-box;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    #guestForm button {
        width: 100%;
        padding: 10px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    #guestForm button:hover {
        background-color: #45a049;
    }
`;
document.head.appendChild(modalStyle);

// Add this function to check session data
function checkSession() {
    const session = window.sessionStorage.getItem('userSession');
    if (session) {
        const parsedSession = JSON.parse(session);
        console.log('Current session:', parsedSession);
        return parsedSession;
    }
    return null;
}

// Add session check function
function isValidSession(session) {
    if (!session) return false;
    
    const required = ['Username', 'Role', 'CustomerID', 'CustomerName'];
    const hasAllFields = required.every(field => session[field]);
    
    console.log('Session validation:', {
        session: session,
        hasAllFields: hasAllFields,
        missingFields: required.filter(field => !session[field])
    });
    
    return hasAllFields;
}

// Check session before any redirect
window.addEventListener('beforeunload', function(e) {
    const session = window.sessionStorage.getItem('userSession');
    if (session) {
        const parsedSession = JSON.parse(session);
        console.log('Session before redirect:', parsedSession);
        console.log('Session valid:', isValidSession(parsedSession));
    }
}); 