console.log('Admin.js loaded');

// Airtable Configuration
window.AIRTABLE_URL = "https://api.airtable.com/v0";
window.BASE_ID = "appipp8LFUGElp3Di";
window.API_KEY = "pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542";

// Helper Functions
function getRoleClass(role) {
    switch (role?.toLowerCase()) {
        case 'admin': return 'bg-danger';
        case 'sub-admin': return 'bg-warning';
        default: return 'bg-primary';
    }
}

// Wait for jQuery and initialize
function waitForJQuery(callback) {
    if (typeof jQuery === 'undefined') {
        setTimeout(() => waitForJQuery(callback), 100);
        return;
    }
    callback();
}

// Main initialization
waitForJQuery(() => {
    $(document).ready(() => {
        console.log('Initializing application...');
        
        // Set up navigation
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                if (sectionId) {
                    handleSectionLoad(sectionId);
                    
                    // Update active state
                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            });
        });

        // Load default section
        handleSectionLoad('accounts');
    });
});

// Make functions globally accessible
window.loadAccounts = loadAccounts;
window.handleSectionLoad = handleSectionLoad;
window.getRoleClass = getRoleClass;

// Section handler
function handleSectionLoad(sectionId) {
    console.log('Loading section:', sectionId);
    
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('Main content not found');
            return;
        }

        // Clear existing content
    mainContent.innerHTML = '';

    // Load appropriate content based on section
    switch (sectionId) {
        case 'accounts':
            loadAccounts();
            break;
        case 'products':
            loadProducts();
            break;
        case 'orders':
            loadOrders();
            break;
        case 'announcements':
            loadAnnouncements();
            break;
        default:
            console.warn('Unknown section:', sectionId);
            mainContent.innerHTML = `
                <div class="alert alert-warning m-3">
                    Unknown section: ${sectionId}
                </div>
            `;
    }
}

// Global variables at the top
let userTable = null;

// Update the initializeDataTable function
function initializeDataTable() {
    // Only initialize if not already initialized
    if ($.fn.DataTable.isDataTable('#accountsTable')) {
        $('#accountsTable').DataTable().destroy();
    }
    
    userTable = $('#accountsTable').DataTable({
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
        order: [[0, 'asc']],
        responsive: true,
        columnDefs: [
            { orderable: false, targets: 4 } // Disable sorting for actions column
        ]
    });
}

// Update loadAccounts to use the global userTable
async function loadAccounts() {
    console.log('Loading accounts...');
    
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('Main content not found');
        return;
    }

    const userRole = sessionStorage.getItem('userRole');
    console.log('Current user role:', userRole);

    mainContent.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3 class="mb-0">User Accounts</h3>
                        <button class="btn btn-primary" onclick="showCreateAccountModal()">
                            <i class="bx bx-plus"></i> Create New Account
                        </button>
                    </div>
                    <div class="table-responsive">
                    <table id="accountsTable" class="table">
                            <thead>
                                <tr>
                                    <th>Username</th>
                                    <th>Customer ID</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                        <tbody>
                                <tr>
                                <td colspan="5" class="text-center">Loading accounts...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
    `;

    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

        const data = await response.json();
        const tbody = document.querySelector('#accountsTable tbody');

        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No accounts found</td></tr>';
            return;
        }

        // Filter records based on user role
            const filteredRecords = data.records.filter(user => {
                if (userRole === 'admin') {
                    return true;
                } else if (userRole === 'sub-admin') {
                    return user.fields.Role === 'user' || !user.fields.Role;
                }
                return false;
            });

        tbody.innerHTML = filteredRecords.map(user => {
                const canManageAccount = userRole === 'admin' || 
                                   (userRole === 'sub-admin' && (user.fields.Role === 'user' || !user.fields.Role));

            return `
                <tr>
                    <td>${user.fields.Username || ''}</td>
                    <td>${user.fields.CustomerID || ''}</td>
                    <td><span class="badge ${getRoleClass(user.fields.Role)}">${(user.fields.Role || 'user').toUpperCase()}</span></td>
                    <td>
                        <span class="badge ${user.fields.Status === 'active' ? 'bg-success' : 'bg-secondary'}">
                            ${user.fields.Status || 'inactive'}
                        </span>
                    </td>
                    <td>
                        ${canManageAccount ? `
                            <div class="btn-group">
                                <button class="btn ${user.fields.Status === 'active' ? 'btn-warning' : 'btn-success'} btn-sm" 
                                        onclick="holdUserAccount('${user.id}', this)">
                                    <i class="bx ${user.fields.Status === 'active' ? 'bx-lock' : 'bx-lock-open'}"></i>
                                    ${user.fields.Status === 'active' ? 'Hold' : 'Activate'}
                                </button>
                                <button class="btn btn-primary btn-sm" onclick="editAccount('${user.id}')">
                                    <i class="bx bx-edit"></i> Edit
                                </button>
                                ${userRole === 'admin' ? `
                                    <button class="btn btn-danger btn-sm" onclick="deleteAccount('${user.id}')">
                                        <i class="bx bx-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        ` : '<span class="text-muted">No actions available</span>'}
                    </td>
                </tr>
                `;
        }).join('');

            // Initialize DataTable
            if ($.fn.DataTable.isDataTable('#accountsTable')) {
                $('#accountsTable').DataTable().destroy();
            }
            
        userTable = $('#accountsTable').DataTable({
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
            responsive: true
        });

    } catch (error) {
        console.error('Error loading accounts:', error);
        const tbody = document.querySelector('#accountsTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Error loading accounts: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Main initialization function
function initializeApp() {
    console.log('Initializing app');

    // Load accounts when document is ready
    $(document).ready(function() {
        console.log('Document ready, loading accounts...');
        loadAccounts();
    });
    }

    // Function to remove CSBOT overlay
    function removeCsbotOverlay() {
        // Remove any existing CS overlays
        const overlays = document.querySelectorAll('.cs-overlay, .cs-widget, #csbot-iframe, .csbot-container');
        overlays.forEach(overlay => {
            if (overlay) {
                overlay.remove();
            }
        });

        // Clean up any CS related styles
        const csStyles = document.querySelectorAll('style[id*="cs"], link[href*="cs"]');
        csStyles.forEach(style => {
            if (style) {
                style.remove();
            }
        });
    }

    // Function to remove CS Bot
    function removeCSBot() {
        // Remove the iframe
        const csBotFrame = document.getElementById('csbot-iframe');
        if (csBotFrame) {
            csBotFrame.remove();
        }

        // Remove any CS bot related elements
        const csBotElements = document.querySelectorAll('[id*="csbot"], [class*="csbot"]');
        csBotElements.forEach(element => element.remove());

        // Remove any CS bot scripts
        const csBotScripts = document.querySelectorAll('script[src*="csbot"]');
        csBotScripts.forEach(script => script.remove());

        // Remove any CS bot styles
        const csBotStyles = document.querySelectorAll('link[href*="csbot"]');
        csBotStyles.forEach(style => style.remove());
    }

// Add this helper function for date formatting
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-SG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Update the loadOrders function
async function loadOrders(filterType = 'all') {
    console.log('Loading orders with filter:', filterType);
    
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('Main content not found');
            return;
        }

    mainContent.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <div class="d-flex align-items-center">
                        <h3 class="mb-0 me-3">Order History</h3>
                        <select class="form-select" id="orderDateFilter" style="width: auto;">
                            <option value="all" ${filterType === 'all' ? 'selected' : ''}>All Orders</option>
                            <option value="today" ${filterType === 'today' ? 'selected' : ''}>Today</option>
                            <option value="month" ${filterType === 'month' ? 'selected' : ''}>This Month</option>
                        </select>
                </div>
                    <div>
                        <button class="btn btn-success me-2" onclick="exportOrders()">
                            <i class="bx bx-download"></i> Export to CSV
                        </button>
                        <button class="btn btn-primary" onclick="refreshOrders()">
                            <i class="bx bx-refresh"></i> Refresh
                        </button>
                    </div>
                    </div>
                <div class="table-responsive">
                    <table id="ordersTable" class="table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer ID</th>
                                <th>Products Ordered</th>
                                <th>Total Price</th>
                                <th>Order Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="6" class="text-center">Loading orders...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                </div>
            </div>
        `;

    // Add event listener for filter changes
    document.getElementById('orderDateFilter').addEventListener('change', (e) => {
        loadOrders(e.target.value);
    });

    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Orders`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Orders data:', data); // Debug log

        const tbody = document.querySelector('#ordersTable tbody');

        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No orders found</td></tr>';
            return;
        }

        // Filter records based on date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const filteredRecords = data.records.filter(order => {
            if (!order.fields['Order Date']) return false;
            const orderDate = new Date(order.fields['Order Date']);
            switch (filterType) {
                case 'today':
                    return orderDate >= today;
                case 'month':
                    return orderDate >= firstDayOfMonth;
                default:
                    return true;
            }
        });

        // Sort filtered records by date (newest first)
        const sortedRecords = filteredRecords.sort((a, b) => {
            const dateA = new Date(a.fields['Order Date'] || 0);
            const dateB = new Date(b.fields['Order Date'] || 0);
            return dateB - dateA;
        });

        if (sortedRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No orders found for selected period</td></tr>';
            return;
        }

        // Populate table with filtered data
        tbody.innerHTML = sortedRecords.map(order => {
            const orderDate = order.fields['Order Date'] ? new Date(order.fields['Order Date']) : new Date();
            return `
                <tr>
                    <td>${order.fields['Order ID'] || ''}</td>
                    <td>${order.fields['Customer ID'] || ''}</td>
                    <td>${order.fields['Products Ordered'] || ''}</td>
                    <td>SGD ${parseFloat(order.fields['Total Price'] || 0).toFixed(2)}</td>
                    <td>${formatDate(orderDate)}</td>
                    <td>
                        <button class="btn btn-info btn-sm" onclick="viewOrderDetails('${order.id}')">
                            <i class="bx bx-detail"></i> Details
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Initialize DataTable
            if ($.fn.DataTable.isDataTable('#ordersTable')) {
                $('#ordersTable').DataTable().destroy();
            }
            
            $('#ordersTable').DataTable({
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
                responsive: true,
            order: [[4, 'desc']], // Sort by Order Date by default
                columnDefs: [
                { targets: -1, orderable: false } // Disable sorting on actions column
            ]
        });

    } catch (error) {
        console.error('Error loading orders:', error);
        const tbody = document.querySelector('#ordersTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    Error loading orders: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Add refresh function
window.refreshOrders = function() {
    const currentFilter = document.getElementById('orderDateFilter')?.value || 'all';
    loadOrders(currentFilter);
};

// Make functions globally accessible
window.loadOrders = loadOrders;

// Function to load announcements
async function loadAnnouncements() {
    console.log('Loading announcements...');
    
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('Main content not found');
            return;
        }
        
    mainContent.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3 class="mb-0">Announcements</h3>
                    <button class="btn btn-primary" onclick="showCreateAnnouncementModal()">
                        <i class="bx bx-plus"></i> Create New Announcement
                    </button>
                </div>
                <div class="table-responsive">
                    <table id="announcementsTable" class="table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Message</th>
                                <th>Target Users</th>
                                <th>Created Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="5" class="text-center">Loading announcements...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Announcements`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

        const data = await response.json();
        console.log('Announcements data:', data);

        const tbody = document.querySelector('#announcementsTable tbody');

        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No announcements found</td></tr>';
                return;
            }

        // Sort records by date (newest first)
        const sortedRecords = data.records.sort((a, b) => {
            const dateA = new Date(a.fields['Created Date'] || 0);
            const dateB = new Date(b.fields['Created Date'] || 0);
            return dateB - dateA;
        });

        tbody.innerHTML = sortedRecords.map(announcement => {
            const createdDate = announcement.fields['Created Date'] ? 
                new Date(announcement.fields['Created Date']) : new Date();
            
            return `
                <tr>
                    <td>${announcement.fields['Title'] || ''}</td>
                    <td>${announcement.fields['Message'] || ''}</td>
                    <td>${announcement.fields['Target Users'] || 'All Users'}</td>
                    <td>${formatDate(createdDate)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-info btn-sm" onclick="viewAnnouncement('${announcement.id}')">
                                <i class="bx bx-detail"></i> View
                            </button>
                            ${getUserRole() === 'admin' ? `
                                <button class="btn btn-primary btn-sm" onclick="editAnnouncement('${announcement.id}')">
                                <i class="bx bx-edit"></i> Edit
                            </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        // Initialize DataTable
        if ($.fn.DataTable.isDataTable('#announcementsTable')) {
            $('#announcementsTable').DataTable().destroy();
        }
        
        $('#announcementsTable').DataTable({
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
                responsive: true,
            order: [[3, 'desc']], // Sort by Created Date by default
                columnDefs: [
                { targets: -1, orderable: false } // Disable sorting on actions column
            ]
        });

    } catch (error) {
        console.error('Error loading announcements:', error);
        const tbody = document.querySelector('#announcementsTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Error loading announcements: ${error.message}
                        </td>
                    </tr>
                `;
            }
}

// Helper functions for announcements
function viewAnnouncement(id) {
    console.log('Viewing announcement:', id);
    $('#announcementDetailsModal').modal('show');
    loadAnnouncementDetails(id);
}

async function loadAnnouncementDetails(id) {
    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Announcements/${id}`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) throw new Error('Failed to load announcement details');
        
        const data = await response.json();
        const modalBody = document.querySelector('#announcementDetailsModal .modal-body');
        
        modalBody.innerHTML = `
            <div class="table-responsive">
                <table class="table table-bordered">
                    <tr>
                        <th>Title:</th>
                        <td>${data.fields['Title'] || ''}</td>
                    </tr>
                    <tr>
                        <th>Message:</th>
                        <td>${data.fields['Message'] || ''}</td>
                    </tr>
                    <tr>
                        <th>Target Users:</th>
                        <td>${data.fields['Target Users'] || 'All Users'}</td>
                    </tr>
                    <tr>
                        <th>Created Date:</th>
                        <td>${formatDate(data.fields['Created Date'])}</td>
                    </tr>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading announcement details:', error);
        const modalBody = document.querySelector('#announcementDetailsModal .modal-body');
        modalBody.innerHTML = `
            <div class="alert alert-danger">
                Error loading announcement details: ${error.message}
            </div>
        `;
    }
}

// Make functions globally accessible
window.loadAnnouncements = loadAnnouncements;
window.viewAnnouncement = viewAnnouncement;

    // Function to check user role and apply restrictions
    function applyRoleBasedAccess() {
        const userRole = sessionStorage.getItem('userRole');
        console.log('Applying restrictions for role:', userRole);

        if (userRole === 'sub-admin') {
            // Modify the navigation for sub-admin
            const nav = $('.nav.flex-column');
            nav.html(`
                <a href="#" class="nav-link active" data-section="accounts">
                    <i class='bx bx-user'></i> User Management
                </a>
                <a href="#" class="nav-link" data-section="products">
                    <i class='bx bx-package'></i> SKU Management
                </a>
                <a href="#" class="nav-link" data-section="orders">
                    <i class='bx bx-cart'></i> Order History
                </a>
                <a href="#" class="nav-link" data-section="announcements">
                    <i class='bx bx-bell'></i> Promotions
                </a>
                <a href="#" class="nav-link" data-section="support">
                    <i class='bx bx-help-circle'></i> CS Bot
                </a>
                <a href="#" class="nav-link" onclick="logout()">
                    <i class='bx bx-log-out'></i> Logout
                </a>
            `);

            // Hide admin-only buttons and show sub-admin specific buttons
            $('.delete-user, .delete-product, .delete-announcement').hide();
            $('.create-admin-btn').hide();
            $('.create-user-btn, .create-sku-btn, .create-promo-btn, .hold-account-btn').show();
        }
    }

    // Function to create action buttons
    function createActionButtons(section) {
        // Remove any existing action buttons first
        $('.action-buttons').remove();
        
        const buttonHtml = `
            <div class="action-buttons mb-3">
                ${section === 'accounts' ? `
                    <button class="btn btn-primary create-user-btn" data-bs-toggle="modal" data-bs-target="#createUserModal">
                        <i class="bx bx-plus"></i> Create User Account
                    </button>
                ` : section === 'products' ? `
                    <button class="btn btn-primary create-sku-btn" data-bs-toggle="modal" data-bs-target="#createProductModal">
                        <i class="bx bx-plus"></i> Create New SKU
                    </button>
                ` : section === 'announcements' ? `
                    <button class="btn btn-primary create-promo-btn" data-bs-toggle="modal" data-bs-target="#createPromoModal">
                        <i class="bx bx-plus"></i> Create Promotion
                    </button>
                ` : ''}
            </div>
        `;
        
        return buttonHtml;
    }

    // Function to show alerts
    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '1050';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
    document.body.appendChild(alertDiv);
    
    // Remove after 3 seconds
            setTimeout(() => {
                alertDiv.remove();
    }, 3000);
    }

    // Function to show create account modal
    window.showCreateAccountModal = function() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('createAccountModal');
        if (!modal) {
            const modalHTML = `
                <div class="modal fade" id="createAccountModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create New Account</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="createAccountForm">
                                    <div class="mb-3">
                                        <label class="form-label">Username *</label>
                                        <input type="text" class="form-control" name="username" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Password *</label>
                                        <input type="password" class="form-control" name="password" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Customer ID</label>
                                        <input type="text" class="form-control" name="customerid">
                                    </div>
                                    ${getUserRole() === 'admin' ? `
                                        <div class="mb-3">
                                            <label class="form-label">Role *</label>
                                            <select class="form-select" name="role" required>
                                                <option value="user">User</option>
                                                <option value="sub-admin">Sub-admin</option>
                                            </select>
                                        </div>
                                    ` : `
                                        <input type="hidden" name="role" value="user">
                                    `}
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="createAccount()">Create Account</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            modal = document.getElementById('createAccountModal');
        }

        // Show modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    };

    // Function to create new account
    window.createAccount = async function() {
        const form = document.getElementById('createAccountForm');
        const submitButton = form.closest('.modal-content').querySelector('.btn-primary');
        
        try {
            submitButton.disabled = true;
            
            // Validate form
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Get form data
            const formData = {
                username: form.querySelector('[name="username"]').value.trim(),
                password: form.querySelector('[name="password"]').value,
                customerid: form.querySelector('[name="customerid"]').value.trim(),
                role: form.querySelector('[name="role"]').value
            };

            // Validate username
            if (formData.username.length < 3) {
                throw new Error('Username must be at least 3 characters long');
            }

            // Validate password
            if (formData.password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Create account
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    records: [{
                        fields: {
                            Username: formData.username,
                            Password: formData.password,
                            CustomerID: formData.customerid || null,
                            Role: formData.role,
                            Status: 'active'
                        }
                    }]
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to create account');
            }

            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('createAccountModal'));
            modal.hide();
            form.reset();

            // Refresh table
            await loadAccounts();
            
            // Show success message
            showAlert('Account created successfully', 'success');

        } catch (error) {
            console.error('Error creating account:', error);
            showAlert(error.message, 'danger');
        } finally {
            submitButton.disabled = false;
        }
    };

    // Function to get user role
    function getUserRole() {
    return sessionStorage.getItem('userRole') || 'user';
    }

    // Function to hold/activate user account
    window.holdUserAccount = async function(userId, button) {
        try {
            const userRole = getUserRole();
            
            // Check if user has permission
            if (userRole !== 'admin' && userRole !== 'sub-admin') {
                throw new Error('Unauthorized action');
            }

            // Get current status
            const isActive = button.innerText.includes('Hold');
            const newStatus = isActive ? 'inactive' : 'active';

            // Update user status
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Status: newStatus
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update user status');
            }

            // Update button appearance
            const icon = button.querySelector('i');
            if (isActive) {
                button.classList.replace('btn-warning', 'btn-success');
                icon.classList.replace('bx-lock', 'bx-lock-open');
                button.innerHTML = `<i class="bx bx-lock-open"></i> Activate`;
            } else {
                button.classList.replace('btn-success', 'btn-warning');
                icon.classList.replace('bx-lock-open', 'bx-lock');
                button.innerHTML = `<i class="bx bx-lock"></i> Hold`;
            }

            // Update status badge
            const statusBadge = button.closest('tr').querySelector('td:nth-child(4) .badge');
            statusBadge.className = `badge ${newStatus === 'active' ? 'bg-success' : 'bg-secondary'}`;
            statusBadge.textContent = newStatus;

            // Show success message
            showAlert('User status updated successfully', 'success');

        } catch (error) {
            console.error('Error updating user status:', error);
            showAlert(error.message, 'danger');
        }
    };

    // Function to edit account
    window.editAccount = function(userId) {
        // Implementation for edit account
        console.log('Edit account:', userId);
    };

    // Update the style section for User Accounts table
    const userAccountStyles = document.createElement('style');
    userAccountStyles.textContent = `
        /* Remove all borders and container lines */
        .user-accounts-container,
        .user-accounts-container *,
        .card,
        .card-body,
        .table-responsive,
        .dataTables_wrapper,
        .dataTables_wrapper * {
            border: none !important;
            box-shadow: none !important;
            outline: none !important;
        }

        /* Basic table styling */
        .table {
            margin: 0 !important;
            background: transparent !important;
        }

        .table td, 
        .table th {
            padding: 1rem !important;
            background: transparent !important;
        }

        .table thead th {
            color: #495057;
            font-weight: 600;
            border-bottom: 1px solid #f0f0f0 !important;
        }

        .table tbody tr:hover {
            background-color: rgba(0,0,0,.02) !important;
        }

        /* Status badges */
        .badge.active {
            background-color: #28a745;
            border-radius: 4px;
            padding: 0.5em 0.75em;
        }

        .badge.user {
            background-color: #007bff;
            border-radius: 4px;
            padding: 0.5em 0.75em;
        }

        /* Action buttons */
        .btn-group {
            gap: 0.5rem;
        }

        /* DataTables wrapper styling */
        .dataTables_wrapper {
            background: transparent !important;
            padding: 0 !important;
        }

        .dataTables_wrapper .row {
            margin: 0 !important;
            padding: 1rem !important;
            background: transparent !important;
        }

        /* Search and length inputs */
        .dataTables_filter input,
        .dataTables_length select {
            border: 1px solid #dee2e6 !important;
            border-radius: 4px !important;
            padding: 0.25rem 0.5rem !important;
            background: white !important;
        }

        /* Pagination styling */
        .dataTables_paginate {
            padding: 1rem !important;
        }

        .paginate_button {
            padding: 0.5rem 0.75rem !important;
            margin: 0 2px !important;
            border-radius: 4px !important;
            border: none !important;
            background: transparent !important;
        }

        .paginate_button.current {
            background: #007bff !important;
            color: white !important;
        }

        /* Remove sorting arrows */
        table.dataTable thead th.sorting,
        table.dataTable thead th.sorting_asc,
        table.dataTable thead th.sorting_desc {
            background-image: none !important;
            cursor: pointer;
        }

        table.dataTable thead th:before,
        table.dataTable thead th:after {
            display: none !important;
        }

        /* Add single sort indicator using Boxicons */
        table.dataTable thead th.sorting:after,
        table.dataTable thead th.sorting_asc:after,
        table.dataTable thead th.sorting_desc:after {
            font-family: "boxicons" !important;
            font-size: 14px;
            position: relative;
            display: inline-block;
            margin-left: 8px;
            opacity: 0.5;
        }

        table.dataTable thead th.sorting:after {
            content: "\\eb96"; /* bx-sort-alt-2 */
        }

        table.dataTable thead th.sorting_asc:after {
            content: "\\eb95"; /* bx-sort-up */
            opacity: 1;
        }

        table.dataTable thead th.sorting_desc:after {
            content: "\\eb94"; /* bx-sort-down */
            opacity: 1;
        }

        /* Improve header text alignment */
        table.dataTable thead th {
            padding: 1rem !important;
            white-space: nowrap;
            position: relative;
            vertical-align: middle;
        }

        /* Rest of your existing styles... */
    `;

    document.head.appendChild(userAccountStyles);

    // Add styles for Products table
    const productStyles = document.createElement('style');
    productStyles.textContent = `
        /* Table styling */
        .table td, 
        .table th {
            padding: 1rem !important;
            vertical-align: middle !important;
        }

        /* Price column */
        .text-end {
            text-align: right !important;
        }

        /* Action button */
        .btn-primary {
            background-color: #007bff;
            border-color: #007bff;
        }

        .btn-primary:hover {
            background-color: #0056b3;
            border-color: #0056b3;
        }

        /* Product name styling */
        .table td:first-child {
            font-weight: 500;
            color: #2c3e50;
        }

        /* Clean up spacing */
        .table {
            margin-bottom: 0 !important;
        }

        .dataTables_wrapper {
            padding: 1rem 0;
        }
    `;

    document.head.appendChild(productStyles);

    // Add custom styles for price alignment and general table appearance
    const additionalStyles = document.createElement('style');
    additionalStyles.textContent = `
        /* Table styling */
        .table td, 
        .table th {
            padding: 1rem !important;
            vertical-align: middle !important;
        }

        /* Price column */
        .text-end {
            text-align: right !important;
        }

        /* Action button */
        .btn-primary {
            background-color: #007bff;
            border-color: #007bff;
        }

        .btn-primary:hover {
            background-color: #0056b3;
            border-color: #0056b3;
        }

        /* Product name styling */
        .table td:first-child {
            font-weight: 500;
            color: #2c3e50;
        }

        /* Clean up spacing */
        .table {
            margin-bottom: 0 !important;
        }

        .dataTables_wrapper {
            padding: 1rem 0;
        }
    `;

    document.head.appendChild(additionalStyles);

    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        initProductsTable();
    });

    function initProductsTable() {
        const productsSection = document.getElementById('products');
        if (!productsSection) return;

        createTable(productsSection, {
            id: 'products-table',
            columns: ['Product Name', 'Price', 'Actions'],
            fetchUrl: 'https://api.airtable.com/v0/appPeGqhQTqeXCWzg/Products',
            fetchOptions: {
                headers: {
                    'Authorization': 'Bearer patKcJXwGzz4xhpFb.d4e0b0518f4f7e7e1c0654d6a5a0c7a7a5c0e5b6a4f7c5d9c8f2e9a8b3c7d4',
                    'Content-Type': 'application/json'
                }
            },
            rowRenderer: (item) => ({
                cells: [
                    item.fields?.['Product Name'] || '',
                    { text: formatPrice(item.fields?.Price), class: 'text-end' },
                    {
                        html: `<button class="btn btn-primary btn-sm" onclick="editProduct('${item.id}')">
                            <i class="bx bx-edit"></i> Edit
                        </button>`,
                        class: 'text-center'
                    }
                ]
            })
        });
    }

function showError(error) {
    console.error('Error:', error);
    const tbody = usersSection.querySelector('tbody');
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center text-danger">
                Error loading users. Please try again.
            </td>
        </tr>
    `;
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getStatusClass(status) {
    switch (status?.toLowerCase()) {
        case 'active': return 'bg-success';
        case 'inactive': return 'bg-secondary';
        case 'pending': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

// Update the logout function
window.logout = function() {
    // Clear session storage
    sessionStorage.clear();
    
    // Redirect to login page using relative path
    window.location.href = '../login.html';
};

// Make sure it's globally accessible
window.logout = logout;

// Function to load products
async function loadProducts() {
    console.log('Loading products...');
    
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) {
        console.error('Main content not found');
        return;
    }

    mainContent.innerHTML = `
        <div class="card shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3 class="mb-0">SKU Management</h3>
                    <button class="btn btn-primary" onclick="showCreateProductModal()">
                        <i class="bx bx-plus"></i> Create New SKU
                </button>
            </div>
                <div class="table-responsive">
                    <table id="productsTable" class="table align-middle">
                <thead>
                    <tr>
                                <th>Image</th>
                                <th>Product Name</th>
                                <th>Price</th>
                                <th>Description</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                                <td colspan="5" class="text-center">Loading products...</td>
                    </tr>
                </tbody>
            </table>
                </div>
            </div>
        </div>
    `;

    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Products`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Products data:', data); // Debug log

        const tbody = document.querySelector('#productsTable tbody');

        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No products found</td></tr>';
                    return;
                }

        tbody.innerHTML = data.records.map(product => `
            <tr>
                <td style="width: 100px;">
                    ${product.fields.Image ? `
                        <img src="${product.fields.Image[0].url}" 
                             alt="${product.fields.Name || 'Product image'}"
                             class="img-thumbnail"
                             style="width: 80px; height: 80px; object-fit: cover;"
                             onclick="showImageModal('${product.fields.Image[0].url}', '${product.fields.Name || 'Product image'}')"
                        >
                    ` : `
                        <div class="bg-light d-flex align-items-center justify-content-center" 
                             style="width: 80px; height: 80px;">
                            <i class="bx bx-image text-secondary" style="font-size: 2rem;"></i>
                        </div>
                    `}
                        </td>
                <td>${product.fields.Name || ''}</td>
                <td>SGD ${parseFloat(product.fields.Price || 0).toFixed(2)}</td>
                <td>${product.fields.Description || ''}</td>
                        <td>
                    <div class="btn-group">
                        <button class="btn btn-primary btn-sm" onclick="editProduct('${product.id}')">
                                <i class="bx bx-edit"></i> Edit
                            </button>
                    </div>
                        </td>
                    </tr>
                `).join('');

        // Initialize DataTable
        if ($.fn.DataTable.isDataTable('#productsTable')) {
            $('#productsTable').DataTable().destroy();
        }
        
        $('#productsTable').DataTable({
            pageLength: 10,
            lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
            responsive: true,
            columnDefs: [
                { orderable: false, targets: [0, 4] } // Disable sorting for image and actions columns
            ]
        });

    } catch (error) {
        console.error('Error loading products:', error);
        const tbody = document.querySelector('#productsTable tbody');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-danger">
                    Error loading products: ${error.message}
                        </td>
                    </tr>
                `;
    }
}

// Add function to show image in modal
function showImageModal(imageUrl, title) {
    const modalHtml = `
        <div class="modal fade" id="imageModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${title}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body text-center">
                        <img src="${imageUrl}" 
                             alt="${title}" 
                             class="img-fluid"
                             style="max-height: 80vh;">
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('imageModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('imageModal'));
    modal.show();
}

// Make functions globally accessible
window.loadProducts = loadProducts;
window.showImageModal = showImageModal;

// Update the export orders function
window.exportOrders = function() {
    // Get current filter
    const currentFilter = document.getElementById('orderDateFilter')?.value || 'all';
    
    // Get the DataTable instance
    const table = $('#ordersTable').DataTable();
    
    // Get the filtered and sorted data
    const data = table.rows({ search: 'applied', order: 'applied' }).data();
    
    // Convert to array and prepare CSV content
    const rows = [];
    data.each(function(row) {
        // Remove the Actions column and any HTML tags
        const cleanRow = Array.from(row).slice(0, -1).map(cell => {
            // Remove HTML tags and trim
            const cleanCell = cell.replace(/<[^>]*>/g, '').trim();
            // Wrap in quotes if contains comma
            return cleanCell.includes(',') ? `"${cleanCell}"` : cleanCell;
        });
        rows.push(cleanRow.join(','));
    });

    // Add headers
    const headers = ['Order ID', 'Customer ID', 'Products Ordered', 'Total Price', 'Order Date'];
    const csvContent = [headers.join(','), ...rows].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Generate filename with filter type and date
    const date = new Date().toISOString().split('T')[0];
    const filterText = currentFilter === 'all' ? 'all_orders' : 
                      currentFilter === 'today' ? 'today_orders' : 
                      'month_orders';
    
    link.href = url;
    link.setAttribute('download', `${filterText}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Show success message
    showAlert('Orders exported successfully', 'success');
};

// Add these helper functions for Orders
function viewOrderDetails(orderId) {
    console.log('Viewing order details for:', orderId);
    // Implement order details view
    $('#orderDetailsModal').modal('show');
    // Load order details into modal
    loadOrderDetails(orderId);
}

async function loadOrderDetails(orderId) {
    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) throw new Error('Failed to load order details');
        
        const data = await response.json();
        console.log('Order details:', data); // Debug log
        
        const modalBody = document.querySelector('#orderDetailsModal .modal-body');
        
        modalBody.innerHTML = `
            <div class="table-responsive">
                <table class="table table-bordered">
                    <tr>
                        <th>Order ID:</th>
                        <td>${data.fields['Order ID'] || ''}</td>
            </tr>
                    <tr>
                        <th>Customer ID:</th>
                        <td>${data.fields['Customer ID'] || ''}</td>
                    </tr>
                    <tr>
                        <th>Products:</th>
                        <td>${data.fields['Products Ordered'] || ''}</td>
                    </tr>
                    <tr>
                        <th>Total Price:</th>
                        <td>SGD ${parseFloat(data.fields['Total Price'] || 0).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <th>Order Date:</th>
                        <td>${formatDate(data.fields['Order Date'])}</td>
                    </tr>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading order details:', error);
        const modalBody = document.querySelector('#orderDetailsModal .modal-body');
        modalBody.innerHTML = `
            <div class="alert alert-danger">
                Error loading order details: ${error.message}
            </div>
        `;
    }
}

// Update the global exports to remove deleteOrder
window.viewOrderDetails = viewOrderDetails;
window.getUserRole = getUserRole;

// Add this function for deleting user accounts
async function deleteAccount(userId) {
    // Check if user is admin
    if (getUserRole() !== 'admin') {
        showAlert('Only administrators can delete accounts', 'danger');
        return;
    }

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete account');
        }

        // Refresh the accounts table
        loadAccounts();
        showAlert('Account deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting account:', error);
        showAlert('Failed to delete account: ' + error.message, 'danger');
    }
}

// Make deleteAccount function globally accessible
window.deleteAccount = deleteAccount;