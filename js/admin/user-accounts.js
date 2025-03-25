// Check authorization
document.addEventListener('DOMContentLoaded', function() {
    // Allow admin and sub-admin roles
    if (!checkAuth(['admin', 'sub-admin'])) return;
    
    // Display current user
    const user = getCurrentUser();
    document.getElementById('current-user').textContent = user.username;
    
    // Load users
    loadUsers();
    
    // Setup event listeners
    setupEventListeners();
});

// Global variables
let users = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentFilters = {
    search: '',
    role: '',
    status: '',
    payment: ''
};
let currentUserRole = '';

// Load users from AirTable
function loadUsers() {
    // Get current user's role
    const user = getCurrentUser();
    currentUserRole = user.role.toLowerCase();
    
    fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.USERS}`, {
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        users = data.records.map(record => ({
            id: record.id,
            ...record.fields
        }));
        applyFiltersAndDisplay();
    })
    .catch(error => {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
    });
}

// Setup event listeners
function setupEventListeners() {
    // Add user button
    const addUserBtn = document.getElementById('add-user-btn');
    addUserBtn.addEventListener('click', showAddUserModal);
    
    // Close modal
    const closeModal = document.querySelector('#user-modal .close');
    closeModal.addEventListener('click', closeUserModal);
    
    // User form submit
    const userForm = document.getElementById('user-form');
    userForm.addEventListener('submit', saveUser);
    
    // Search and filters
    const searchInput = document.getElementById('search-user');
    const roleFilter = document.getElementById('filter-role');
    const statusFilter = document.getElementById('filter-status');
    const paymentFilter = document.getElementById('filter-payment');
    
    searchInput.addEventListener('input', function() {
        currentFilters.search = this.value;
        currentPage = 1;
        applyFiltersAndDisplay();
    });
    
    roleFilter.addEventListener('change', function() {
        currentFilters.role = this.value;
        currentPage = 1;
        applyFiltersAndDisplay();
    });
    
    statusFilter.addEventListener('change', function() {
        currentFilters.status = this.value;
        currentPage = 1;
        applyFiltersAndDisplay();
    });
    
    paymentFilter.addEventListener('change', function() {
        currentFilters.payment = this.value;
        currentPage = 1;
        applyFiltersAndDisplay();
    });
}

// Filter and display users
function applyFiltersAndDisplay() {
    let filteredUsers = users;
    
    // If sub-admin, filter out admin users from view
    if (currentUserRole === 'sub-admin') {
        filteredUsers = filteredUsers.filter(user => 
            user.Role && user.Role.toLowerCase() !== 'admin'
        );
    }
    
    // Apply search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
            (user.Username && user.Username.toLowerCase().includes(searchTerm)) || 
            (user.CustomerName && user.CustomerName.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply role filter
    if (currentFilters.role) {
        filteredUsers = filteredUsers.filter(user => 
            user.Role && user.Role.toLowerCase() === currentFilters.role.toLowerCase()
        );
    }
    
    // Apply status filter
    if (currentFilters.status) {
        const isActive = currentFilters.status === 'Active';
        filteredUsers = filteredUsers.filter(user => 
            (isActive && !user.IsDisabled) || (!isActive && user.IsDisabled)
        );
    }
    
    // Apply payment filter
    if (currentFilters.payment) {
        filteredUsers = filteredUsers.filter(user => 
            user.Paid === currentFilters.payment
        );
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const usersToDisplay = filteredUsers.slice(startIndex, endIndex);
    
    // Display users
    displayUsers(usersToDisplay);
    
    // Display pagination
    displayPagination(totalPages);
}

// Display users in the table
function displayUsers(usersToDisplay) {
    const tableBody = document.querySelector('#users-table tbody');
    tableBody.innerHTML = '';
    
    if (usersToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="7" class="text-center">No users found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    usersToDisplay.forEach(user => {
        const row = document.createElement('tr');
        
        const statusBadge = user.IsDisabled ? 
            '<span class="badge badge-danger">Inactive</span>' : 
            '<span class="badge badge-success">Active</span>';
            
        // Only show paid badge for regular users, not for admin/sub-admin
        let paidBadge;
        if (user.Role && (user.Role.toLowerCase() === 'admin' || user.Role.toLowerCase() === 'sub-admin')) {
            paidBadge = '<span class="badge badge-light">N/A</span>';
        } else {
            paidBadge = user.Paid === 'Yes' ? 
                '<span class="badge badge-success">Paid</span>' : 
                '<span class="badge badge-warning">Unpaid</span>';
        }
        
        // Determine if current user can edit/disable this user
        const canEdit = currentUserRole === 'admin' || 
                        (currentUserRole === 'sub-admin' && user.Role && user.Role.toLowerCase() !== 'admin');
        
        // Determine if current user can toggle payment status
        // Only regular users can have their payment status toggled, not admin or sub-admin
        const canTogglePayment = user.Role && 
                               user.Role.toLowerCase() === 'user';
        
        // Create action buttons based on permissions
        let actionButtons = '';
        
        if (canEdit) {
            actionButtons += `<button class="btn btn-sm" onclick="editUser('${user.id}')">Edit</button> `;
            actionButtons += `<button class="btn btn-sm ${user.IsDisabled ? 'btn-primary' : 'btn-danger'}" 
                             onclick="toggleUserStatus('${user.id}', ${user.IsDisabled})">
                                ${user.IsDisabled ? 'Enable' : 'Disable'}
                             </button> `;
        }
        
        if (canTogglePayment) {
            actionButtons += `<button class="btn btn-sm ${user.Paid === 'Yes' ? 'btn-warning' : 'btn-success'}" 
                             onclick="togglePaymentStatus('${user.id}', '${user.Paid || 'No'}')">
                                ${user.Paid === 'Yes' ? 'Mark Unpaid' : 'Mark Paid'}
                             </button>`;
        }
        
        row.innerHTML = `
            <td>${user.Username || ''}</td>
            <td>${user.CustomerName || ''}</td>
            <td>${user.Role || ''}</td>
            <td>${statusBadge}</td>
            <td>${formatDate(user.LastLogin) || 'Never'}</td>
            <td>${paidBadge}</td>
            <td>${actionButtons}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Display pagination controls
function displayPagination(totalPages) {
    const paginationDiv = document.getElementById('pagination');
    paginationDiv.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.classList.add('btn', 'btn-sm');
    prevButton.textContent = 'Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            applyFiltersAndDisplay();
        }
    });
    paginationDiv.appendChild(prevButton);
    
    // Page numbers
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.classList.add('btn', 'btn-sm');
        if (i === currentPage) pageButton.classList.add('btn-primary');
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            applyFiltersAndDisplay();
        });
        paginationDiv.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.classList.add('btn', 'btn-sm');
    nextButton.textContent = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            applyFiltersAndDisplay();
        }
    });
    paginationDiv.appendChild(nextButton);
}

// Show add user modal
function showAddUserModal() {
    // Reset form
    document.getElementById('modal-title').textContent = 'Add New User';
    document.getElementById('user-form').reset();
    document.getElementById('user-id').value = '';
    
    // If sub-admin, restrict role selection
    const roleSelect = document.getElementById('role');
    if (currentUserRole === 'sub-admin') {
        // Remove admin role option for sub-admins
        Array.from(roleSelect.options).forEach(option => {
            if (option.value.toLowerCase() === 'admin') {
                option.disabled = true;
            }
        });
        // Set default to user
        roleSelect.value = 'user';
    } else {
        // Enable all options for admins
        Array.from(roleSelect.options).forEach(option => {
            option.disabled = false;
        });
    }
    
    document.getElementById('user-modal').style.display = 'block';
}

// Close user modal
function closeUserModal() {
    document.getElementById('user-modal').style.display = 'none';
}

// Edit user
function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // If sub-admin and trying to edit admin, prevent
    if (currentUserRole === 'sub-admin' && user.Role && user.Role.toLowerCase() === 'admin') {
        showNotification('You are not authorized to edit admin accounts', 'error');
        return;
    }
    
    document.getElementById('modal-title').textContent = 'Edit User';
    document.getElementById('user-id').value = userId;
    document.getElementById('username').value = user.Username || '';
    document.getElementById('password').value = user.Password || '';
    document.getElementById('role').value = user.Role || '';
    document.getElementById('customer-name').value = user.CustomerName || '';
    document.getElementById('customer-id').value = user.BPCode || '';
    document.getElementById('status').value = user.IsDisabled ? 'Inactive' : 'Active';
    document.getElementById('outlet-name').value = user.OutletName || '';
    document.getElementById('address').value = user.Address || '';
    document.getElementById('contact-info').value = user.ContactInfo || '';
    document.getElementById('payment-terms').value = user.PaymentTerms || 'COD';
    document.getElementById('contracted').value = user.Contracted || 'No';
    document.getElementById('contract-volume').value = user.ContractVolume || '';
    document.getElementById('paid').value = user.Paid || 'No';
    
    // If sub-admin, restrict role selection
    const roleSelect = document.getElementById('role');
    if (currentUserRole === 'sub-admin') {
        // Prevent changing to admin role
        Array.from(roleSelect.options).forEach(option => {
            if (option.value.toLowerCase() === 'admin') {
                option.disabled = true;
            }
        });
    } else {
        // Enable all options for admins
        Array.from(roleSelect.options).forEach(option => {
            option.disabled = false;
        });
    }
    
    document.getElementById('user-modal').style.display = 'block';
}

// Toggle user status (enable/disable)
function toggleUserStatus(userId, isCurrentlyDisabled) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // If sub-admin and trying to modify admin, prevent
    if (currentUserRole === 'sub-admin' && user.Role && user.Role.toLowerCase() === 'admin') {
        showNotification('You are not authorized to modify admin accounts', 'error');
        return;
    }
    
    const currentUser = getCurrentUser();
    if (currentUser.id === userId) {
        showNotification('You cannot disable your own account', 'error');
        return;
    }
    
    const newStatus = !isCurrentlyDisabled;
    showNotification(`Updating user status...`, 'info');
    
    fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.USERS}/${userId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                IsDisabled: newStatus
            }
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Failed to update user status: ${response.status} ${response.statusText} - ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        // Update local user data
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].IsDisabled = newStatus;
        }
        
        // Log the action
        logAccess(
            currentUser.id,
            'User Status Change',
            `${currentUser.username} ${newStatus ? 'disabled' : 'enabled'} user ${user.Username}`
        );
        
        showNotification(`User ${newStatus ? 'disabled' : 'enabled'} successfully`);
        applyFiltersAndDisplay();
    })
    .catch(error => {
        console.error('Error updating user status:', error);
        
        // Provide more detailed error message
        let errorMessage = 'Failed to update user status';
        if (error.message && error.message.includes('Failed to update user status:')) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    });
}

// Toggle payment status (paid/unpaid)
function togglePaymentStatus(userId, currentStatus) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const newStatus = currentStatus === 'Yes' ? 'No' : 'Yes';
    showNotification(`Updating payment status...`, 'info');
    
    fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.USERS}/${userId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                Paid: newStatus
            }
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Failed to update payment status: ${response.status} ${response.statusText} - ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        // Update local user data
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].Paid = newStatus;
        }
        
        // Log the action
        const currentUser = getCurrentUser();
        logAccess(
            currentUser.id,
            'Payment Status Change',
            `${currentUser.username} marked user ${user.Username} as ${newStatus === 'Yes' ? 'paid' : 'unpaid'}`
        );
        
        showNotification(`User marked as ${newStatus === 'Yes' ? 'paid' : 'unpaid'} successfully`);
        applyFiltersAndDisplay();
    })
    .catch(error => {
        console.error('Error updating payment status:', error);
        
        // Provide more detailed error message
        let errorMessage = 'Failed to update payment status';
        if (error.message && error.message.includes('Failed to update payment status:')) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    });
}

// Save user (create or update)
function saveUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('user-id').value;
    const isEditing = !!userId;
    const currentUser = getCurrentUser();
    const selectedRole = document.getElementById('role').value;
    
    // If sub-admin trying to create/edit an admin account, prevent
    if (currentUserRole === 'sub-admin' && selectedRole.toLowerCase() === 'admin') {
        showNotification('You are not authorized to create or modify admin accounts', 'error');
        return;
    }
    
    // Get contract volume value and convert to null if empty
    const contractVolumeInput = document.getElementById('contract-volume').value;
    const contractVolume = contractVolumeInput.trim() === '' ? null : contractVolumeInput;
    
    // Build user data
    const userData = {
        Username: document.getElementById('username').value,
        Password: document.getElementById('password').value,
        Role: selectedRole,
        CustomerName: document.getElementById('customer-name').value,
        BPCode: document.getElementById('customer-id').value,
        IsDisabled: document.getElementById('status').value === 'Inactive',
        OutletName: document.getElementById('outlet-name').value,
        Address: document.getElementById('address').value,
        ContactInfo: document.getElementById('contact-info').value,
        PaymentTerms: document.getElementById('payment-terms').value,
        Contracted: document.getElementById('contracted').value,
        ContractVolume: contractVolume,
        Paid: document.getElementById('paid').value
    };
    
    // Remove fields with empty values to prevent AirTable validation errors
    Object.keys(userData).forEach(key => {
        if (userData[key] === '') {
            userData[key] = null;
        }
    });
    
    // If creating a new user, add created by
    if (!isEditing) {
        userData.Createdby = currentUser.username;
    }
    
    // Validate username is unique for new users
    if (!isEditing && users.some(u => u.Username === userData.Username)) {
        showNotification('Username already exists', 'error');
        return;
    }
    
    // Show loading notification
    showNotification('Saving user...', 'info');
    
    // API call to create or update user
    const method = isEditing ? 'PATCH' : 'POST';
    const url = isEditing 
        ? `${API_URL}/${AIRTABLE_CONFIG.TABLES.USERS}/${userId}`
        : `${API_URL}/${AIRTABLE_CONFIG.TABLES.USERS}`;
    
    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: userData
        })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Failed to save user: ${response.status} ${response.statusText} - ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        // Update local data
        if (isEditing) {
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                users[userIndex] = {
                    id: userId,
                    ...userData
                };
            }
        } else {
            users.push({
                id: data.id,
                ...userData
            });
        }
        
        // Log the action
        logAccess(
            currentUser.id,
            isEditing ? 'User Updated' : 'User Created',
            `${currentUser.username} ${isEditing ? 'updated' : 'created'} user ${userData.Username}`
        );
        
        closeUserModal();
        showNotification(`User ${isEditing ? 'updated' : 'created'} successfully`);
        applyFiltersAndDisplay();
    })
    .catch(error => {
        console.error('Error saving user:', error);
        
        // Provide a more detailed error message
        let errorMessage = 'Failed to save user';
        if (error.message && error.message.includes('Failed to save user:')) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    });
} 