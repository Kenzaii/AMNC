document.addEventListener('DOMContentLoaded', function() {
    // Constants for role-based access
    const ROLES = {
        ADMIN: 'admin',
        SUB_ADMIN: 'sub-admin',
        USER: 'user',
        GUEST: 'guest'
    };

    const ACCESS_LEVELS = {
        [ROLES.ADMIN]: {
            canCreateSubAdmin: true,
            canCreateUser: true,
            canCreateSKU: true,
            canHoldAccounts: true,
            canUnholdAccounts: true,
            canUseCSBot: true,
            dashboard: 'admin'
        },
        [ROLES.SUB_ADMIN]: {
            canCreateSubAdmin: false,
            canCreateUser: true,
            canCreateSKU: true,
            canHoldAccounts: true,
            canUnholdAccounts: false,
            canUseCSBot: true,
            dashboard: 'admin'
        },
        [ROLES.USER]: {
            canCreateOrders: true,
            canUseCSBot: true,
            dashboard: 'customer'
        },
        [ROLES.GUEST]: {
            canCreateOrders: true,
            canUseCSBot: false,
            dashboard: 'customer'
        }
    };

    // Airtable configuration
    const AIRTABLE_URL = 'https://api.airtable.com/v0';
    const BASE_ID = 'appipp8LFUGElp3Di';
    const API_KEY = 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542';

    // Function to log user activity with correct Airtable fields
    async function logUserActivity(userId, action, details, guestData = null) {
        try {
            const logData = {
                records: [{
                    fields: {
                        "UserID": userId,
                        "Action": action,
                        "Timestamp": new Date().toISOString(),
                        "Details": details
                    }
                }]
            };

            // Add guest data if provided
            if (guestData) {
                logData.records[0].fields.GuestName = guestData.name;
                logData.records[0].fields.GuestEmail = guestData.email;
                logData.records[0].fields.GuestPhone = guestData.phone;
            }

            const response = await fetch(`${AIRTABLE_URL}/${BASE_ID}/AccessLogs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(logData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('Activity logged successfully');
        } catch (error) {
            console.error('Error logging activity:', error);
        }
    }

    // Updated login handler with proper logging
    async function handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${AIRTABLE_URL}/${BASE_ID}/Users?filterByFormula=AND(Username%3D'${username}',Password%3D'${password}')`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`
                }
            });

            const data = await response.json();

            if (data.records && data.records.length > 0) {
                const user = data.records[0];
                
                // Store user information
                sessionStorage.setItem('userId', user.id);
                sessionStorage.setItem('username', user.fields.Username);
                sessionStorage.setItem('userRole', user.fields.Role);
                sessionStorage.setItem('userStatus', user.fields.Status);
                sessionStorage.setItem('customerId', user.fields.CustomerID);

                // Log successful login
                await logUserActivity(
                    user.id,
                    'Login',
                    `Successful login by ${user.fields.Username} with role ${user.fields.Role || 'user'}`
                );

                // Check if account is on hold
                if (user.fields.Status === 'hold') {
                    await logUserActivity(
                        user.id,
                        'Access Denied',
                        `Account ${user.fields.Username} is on hold`
                    );
                    window.location.href = 'restricted.html';
                    return;
                }

                // Redirect based on role
                switch (user.fields.Role?.toLowerCase()) {
                    case 'admin':
                    case 'sub-admin':
                        window.location.href = 'admin/dashboard.html';
                        break;
                    default:
                        window.location.href = 'customer/dashboard.html';
                }
            } else {
                // Log failed login attempt
                await logUserActivity(
                    'unknown',
                    'Failed Login',
                    `Failed login attempt with username: ${username}`
                );
                alert('Invalid username or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            // Log error
            await logUserActivity(
                'unknown',
                'Login Error',
                `System error during login attempt: ${error.message}`
            );
            alert('An error occurred during login. Please try again.');
        }
    }

    // Add event listener for form submission
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Guest order handler
    document.getElementById('guestOrderBtn').addEventListener('click', function() {
        const guestModal = new bootstrap.Modal(document.getElementById('guestModal'));
        guestModal.show();
    });

    // Guest handler with proper logging
    document.getElementById('continueAsGuest').addEventListener('click', async function() {
        const guestData = {
            name: document.getElementById('guestName').value,
            email: document.getElementById('guestEmail').value,
            phone: document.getElementById('guestPhone').value
        };

        // Generate a unique guest ID
        const guestId = 'GUEST_' + new Date().getTime();

        // Store guest data and role
        sessionStorage.setItem('guestData', JSON.stringify(guestData));
        sessionStorage.setItem('userRole', ROLES.GUEST);
        sessionStorage.setItem('userId', guestId);

        // Log guest access with all required fields
        await logUserActivity(
            guestId,
            'Guest Login',
            `Guest access initiated`,
            guestData
        );

        window.location.href = 'customer/dashboard.html';
    });

    // Validate guest form before submission
    document.getElementById('guestForm').addEventListener('submit', function(e) {
        e.preventDefault();
        document.getElementById('continueAsGuest').click();
    });
}); 