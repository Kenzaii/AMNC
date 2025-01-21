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