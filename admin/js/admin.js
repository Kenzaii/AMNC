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
function handleSectionLoad(section) {
    console.log('Loading section:', section);
    
    // Clear main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = '<div class="container-fluid"></div>';
    }

    // Load appropriate section
    switch(section) {
        case 'accounts':
            loadUserAccounts();
            break;
        case 'userAccounts':
            loadUserAccounts();
            break;
        case 'orderSummary':
            loadOrderSummary();
            break;
        case 'userChange':
            loadUserChange();
            break;
        case 'dashboard':
            loadDashboard();
            break;
        case 'products':
            loadSectionData('products');
            break;
        case 'orders':
            loadSectionData('orders');
            break;
        default:
            console.error('Unknown section:', section);
            mainContent.innerHTML = `
                <div class="container-fluid">
                    <div class="alert alert-danger">
                        Unknown section: ${section}
                    </div>
                </div>
            `;
    }
}

// Global variables
let userTable;
let productTable;

// Shared styles for all tabs
const sharedStyles = `
    <style>
        /* Remove all outlines */
        * {
            outline: none !important;
        }

        /* Remove focus outlines */
        *:focus {
            box-shadow: none !important;
        }

        /* Table styles */
        .table {
            border-collapse: separate;
            border-spacing: 0;
        }
        
        .table th,
        .table td {
            border: none;
            padding: 12px 8px;
        }
        
        .table thead th {
            font-weight: 500;
            font-size: 0.875rem;
        }
        
        /* Form controls */
        .form-control,
        .form-select {
            border: none;
            background-color: #f8f9fa;
        }

        .form-control:focus,
        .form-select:focus {
            border: none;
            background-color: #f0f1f2;
        }

        /* Buttons */
        .btn {
            border: none;
        }

        /* Modal */
        .modal-content {
            border: none;
        }

        .modal-header,
        .modal-footer {
            border: none;
        }

        /* DataTables specific */
        .dataTables_wrapper .dataTables_length select,
        .dataTables_wrapper .dataTables_filter input {
            border: none;
            background-color: #f8f9fa;
            padding: 4px 8px;
        }

        .dataTables_wrapper .dataTables_paginate .paginate_button {
            border: none !important;
        }

        .dataTables_wrapper .dataTables_paginate .paginate_button:hover,
        .dataTables_wrapper .dataTables_paginate .paginate_button:focus {
            background: #f8f9fa !important;
            border: none !important;
        }

        /* Custom elements */
        .product-img-container {
            width: 50px;
            height: 50px;
            min-width: 50px;
            position: relative;
            overflow: hidden;
            border-radius: 4px;
            background-color: #f8f9fa;
        }
        
        .product-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
        }
    </style>
`;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add shared styles to document
    document.head.insertAdjacentHTML('beforeend', sharedStyles);

    // Initialize DataTables with custom styling
    const dataTableOptions = {
        pageLength: 10,
        lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
        responsive: true,
        dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
        language: {
            search: "",
            searchPlaceholder: "Search..."
        }
    };

    // Initialize tables if they exist
    if (document.getElementById('usersTable')) {
        userTable = $('#usersTable').DataTable(dataTableOptions);
    }

    if (document.getElementById('productsTable')) {
        productTable = $('#productsTable').DataTable(dataTableOptions);
    }

    if (document.getElementById('ordersTable')) {
        $('#ordersTable').DataTable(dataTableOptions);
    }

    // Initialize Airtable
    const myAirtableBase = new Airtable({
        apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'
    }).base('appipp8LFUGElp3Di');

    // Section configuration
    const sections = {
        'products': {
            tableName: 'Products',
            displayName: 'Products Management',
            fields: ['Name', 'Price', 'ImageURL', 'CustomerID']
        },
        'orders': {
            tableName: 'Orders', // Make sure this matches your Airtable table name exactly
            displayName: 'Orders History',
            fields: ['OrderID', 'CustomerID', 'ProductsOrdered', 'TotalPrice', 'OrderDate', 'Timestamp']
        }
    };

    // Function to load section data
    function loadSectionData(sectionName) {
        console.log('Loading section:', sectionName);
        try {
            const section = sections[sectionName];
            if (!section) {
                console.error('Section not found:', sectionName);
                return;
            }

            console.log('Loading from table:', section.tableName);

            // Create new Airtable instance
            const base = new Airtable({
                apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'
            }).base('appipp8LFUGElp3Di');

            // Fetch records
            base(section.tableName).select({
                maxRecords: 100,
                view: "Grid view"
            }).eachPage(
                function page(records, fetchNextPage) {
                    console.log(`Fetched ${records.length} records from ${section.tableName}`);
                    console.log('First record:', records[0]?.fields);

                    if (sectionName === 'orders') {
                        displayOrders(records);
                    } else if (sectionName === 'products') {
                        displayProducts(records);
                    }
                    
                    fetchNextPage();
                },
                function done(err) {
                    if (err) {
                        console.error('Error loading data:', err);
                        const mainContent = document.querySelector('.main-content');
                        if (mainContent) {
                            mainContent.innerHTML = `
                                <div class="alert alert-danger m-3">
                                    Error loading data: ${err.message}
                                </div>
                            `;
                        }
                    }
                }
            );
        } catch (error) {
            console.error('Error in loadSectionData:', error);
        }
    }

    // Function to display products
    function displayProducts(records) {
        console.log('Displaying products:', records);
        
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('Main content element not found');
            return;
        }
        
        const html = `
            <div class="container-fluid p-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>Products List</h3>
                    <button class="btn btn-primary" onclick="addNewProduct()">
                        <i class="fas fa-plus"></i> Add New Product
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="table table-striped" id="productsTable">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Price</th>
                                <th>Image</th>
                                <th>Customer ID</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${records.map(record => `
                                <tr>
                                    <td class="align-middle"><strong>${record.fields.Name || ''}</strong></td>
                                    <td class="align-middle">${record.fields.Price ? `$${Number(record.fields.Price).toFixed(2)}` : ''}</td>
                                    <td class="align-middle">
                                        ${record.fields.ImageURL ? 
                                            `<img src="${record.fields.ImageURL}" 
                                                alt="${record.fields.Name}" 
                                                class="img-thumbnail"
                                                style="height: 50px; width: auto;"
                                            >` : 
                                            '<span class="text-muted">No Image</span>'}
                                    </td>
                                    <td class="align-middle">
                                        ${record.fields.CustomerID || ''}
                                    </td>
                                    <td class="align-middle">
                                        <button class="btn btn-sm btn-primary me-1" onclick="editProduct('${record.id}')">
                                            <i class="fas fa-edit"></i> Edit
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${record.id}')">
                                            <i class="fas fa-trash"></i> Delete
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        mainContent.innerHTML = html;

        // Initialize DataTable
        if ($.fn.DataTable.isDataTable('#productsTable')) {
            $('#productsTable').DataTable().destroy();
        }
        
        $('#productsTable').DataTable({
            pageLength: 10,
            responsive: true,
            order: [[0, 'asc']]
        });
    }

    // Helper functions for actions
    function viewProduct(id) {
        console.log('Viewing product:', id);
    }

    // Function to edit product
    function editProduct(id) {
        console.log('Editing product with ID:', id);
        
        // First get the product details
        const base = new Airtable({apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'}).base('appipp8LFUGElp3Di');
        
        base('Products').find(id, function(err, record) {
            if (err) {
                console.error('Error fetching product:', err);
                alert('Error fetching product details');
                return;
            }
            
            console.log('Found product:', record);
            
            // Create modal HTML
            const modal = `
                <div class="modal fade" id="editProductModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Edit Product</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editProductForm">
                                    <input type="hidden" id="editProductId" value="${id}">
                                    <div class="mb-3">
                                        <label for="editProductName" class="form-label">Name</label>
                                        <input type="text" class="form-control" id="editProductName" 
                                            value="${record.fields.Name || ''}" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editProductPrice" class="form-label">Price ($)</label>
                                        <input type="number" class="form-control" id="editProductPrice" 
                                            value="${record.fields.Price || ''}" step="0.01" min="0" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="editProductImage" class="form-label">Image URL</label>
                                        <input type="url" class="form-control" id="editProductImage" 
                                            value="${record.fields.ImageURL || ''}">
                                    </div>
                                    <div class="mb-3">
                                        <label for="editProductCustomerId" class="form-label">Customer ID</label>
                                        <input type="text" class="form-control" id="editProductCustomerId" 
                                            value="${record.fields.CustomerID || ''}">
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="saveProductChanges('${id}')">
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove any existing modal
            const existingModal = document.getElementById('editProductModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Add modal to document
            document.body.insertAdjacentHTML('beforeend', modal);
            
            // Show modal
            const modalElement = document.getElementById('editProductModal');
            const bootstrapModal = new bootstrap.Modal(modalElement);
            bootstrapModal.show();
            
            // Clean up modal when closed
            modalElement.addEventListener('hidden.bs.modal', function() {
                modalElement.remove();
            });
        });
    }

    // Function to save product changes
    function saveProductChanges(id) {
        console.log('Saving changes for product:', id);
        
        // Get form values
        const name = document.getElementById('editProductName').value;
        const price = document.getElementById('editProductPrice').value;
        const imageUrl = document.getElementById('editProductImage').value;
        const customerId = document.getElementById('editProductCustomerId').value;

        // Validate required fields
        if (!name || !price) {
            alert('Name and Price are required!');
            return;
        }

        // Create new Airtable instance
        const base = new Airtable({apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'}).base('appipp8LFUGElp3Di');

        // Update record
        base('Products').update([
            {
                id: id,
                fields: {
                    Name: name,
                    Price: parseFloat(price),
                    ImageURL: imageUrl || null,
                    CustomerID: customerId || null
                }
            }
        ], function(err, records) {
            if (err) {
                console.error('Error updating product:', err);
                alert('Error updating product');
                return;
            }
            
            console.log('Product updated successfully:', records);
            
            // Close modal
            const modalElement = document.getElementById('editProductModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            
            // Refresh products list
            loadSectionData('products');
            
            // Show success message
            alert('Product updated successfully!');
        });
    }

    // Make functions globally available
    window.editProduct = editProduct;
    window.saveProductChanges = saveProductChanges;

    function deleteProduct(id) {
        console.log('Deleting product:', id);
        
        if (confirm('Are you sure you want to delete this product?')) {
            myAirtableBase('Products').destroy(id, function(err, deletedRecord) {
                if (err) {
                    console.error('Error deleting product:', err);
                    alert('Error deleting product');
                    return;
                }
                
                console.log('Product deleted:', deletedRecord);
                
                // Refresh products list
                loadSectionData('products');
                
                // Show success message
                alert('Product deleted successfully!');
            });
        }
    }

    // Make functions globally available
    window.loadSectionData = loadSectionData;
    window.viewProduct = viewProduct;
    window.deleteProduct = deleteProduct;

    console.log('Application initialized');
});

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
        <div class="container-fluid">
            <h3 class="mb-4">User Accounts</h3>
            <div class="row">
                <div class="col-md-12">
                    <div class="card">
                        <div class="card-body">
                            <form id="userAccountForm">
                                <div class="mb-3">
                                    <label for="customerCode" class="form-label">Customer Code</label>
                                    <input type="text" class="form-control" id="customerCode" required>
                                </div>
                                <div class="mb-3">
                                    <label for="customerName" class="form-label">Customer Name</label>
                                    <input type="text" class="form-control" id="customerName" readonly>
                                </div>
                                <div class="mb-3">
                                    <label for="username" class="form-label">Username</label>
                                    <input type="text" class="form-control" id="username" required>
                                </div>
                                <div class="mb-3">
                                    <label for="password" class="form-label">Password</label>
                                    <input type="password" class="form-control" id="password" required>
                                </div>
                                <button type="submit" class="btn btn-primary">Submit</button>
                            </form>
                            <!-- ... rest of the HTML ... -->
    `;

    // Add auto-fill functionality for Customer Name
    document.getElementById('customerCode').addEventListener('blur', async function() {
        const customerCode = this.value.trim();
        const customerNameInput = document.getElementById('customerName');
        
        if (!customerCode) {
            customerNameInput.value = '';
            return;
        }

        try {
            const response = await fetch(
                `${window.AIRTABLE_URL}/${window.BASE_ID}/Customer?filterByFormula=AND({Customer Code}='${customerCode}',{Status}='Active')`,
                {
                    headers: {
                        'Authorization': `Bearer ${window.API_KEY}`
                    }
                }
            );

            if (!response.ok) throw new Error('Failed to fetch customer data');
            
            const data = await response.json();
            if (data.records && data.records.length > 0) {
                customerNameInput.value = data.records[0].fields['Customer Name'] || '';
            } else {
                customerNameInput.value = '';
                showAlert('Invalid Customer Code or Customer is not active', 'warning');
            }
        } catch (error) {
            console.error('Error:', error);
            customerNameInput.value = '';
            showAlert('Error fetching customer data', 'danger');
        }
    });

    // Update the form submission handler to use the customer name
    document.getElementById('userAccountForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const customerCode = document.getElementById('customerCode').value;
        const customerName = document.getElementById('customerName').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!customerName) {
            showAlert('Please enter a valid Customer Code', 'warning');
            return;
        }

        try {
            // Check if username already exists
            const userResponse = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/User?filterByFormula={Username}='${username}'`, {
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`
                }
            });

            if (!userResponse.ok) throw new Error('Failed to check username');
            
            const userData = await userResponse.json();
            if (userData.records && userData.records.length > 0) {
                throw new Error('Username already exists');
            }

            // Create new user
            const createResponse = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/User`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        'Customer Code': customerCode,
                        'Customer Name': customerName,
                        'Username': username,
                        'Password': password
                    }
                })
            });

            if (!createResponse.ok) throw new Error('Failed to create user account');

            showAlert('User account created successfully', 'success');
            document.getElementById('userAccountForm').reset();
            loadUserAccounts(); // Reload the table
        } catch (error) {
            console.error('Error:', error);
            showAlert(error.message, 'danger');
        }
    });

    // ... rest of the HTML ...

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

            // Update DataTable
            if (userTable) {
                userTable.destroy();
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

// Function to load orders
async function loadOrders() {
    console.log('Loading orders...');

    // Create the table structure first
    const tableHTML = `
        <div class="container-fluid">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3 class="mb-0">Order History</h3>
                <div>
                    <button class="btn btn-primary" id="downloadSelectedCSV" disabled>
                        <i class="bx bx-download"></i> Download Selected
                    </button>
                    <button class="btn btn-secondary" onclick="downloadAllCSV()">
                        <i class="bx bx-download"></i> Download All
                    </button>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="ordersTable" class="table table-striped">
                            <thead>
                                <tr>
                                    <th>
                                        <input type="checkbox" id="selectAllOrders" class="form-check-input">
                                    </th>
                                    <th>Order ID</th>
                                    <th>Customer ID</th>
                                    <th>Products</th>
                                    <th>Total Price</th>
                                    <th>Order Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="orderList">
                                <tr>
                                    <td colspan="7" class="text-center">Loading orders...</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add the table to the main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = tableHTML;
    }

    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Orders`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch orders');
        
        const data = await response.json();
        console.log('Orders data:', data);
        
        const tbody = document.getElementById('orderList');
        if (!tbody) throw new Error('Table body element not found');
        
        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        
        data.records.forEach(record => {
            const row = document.createElement('tr');
            
            // Create checkbox cell with complete record data
            const checkboxCell = document.createElement('td');
            checkboxCell.innerHTML = `
                <input type="checkbox" class="form-check-input order-checkbox" 
                    data-order-data='${JSON.stringify({
                        'Order ID': record.fields['Order ID'] || '',
                        'Customer ID': record.fields['Customer ID'] || '',
                        'Products Ordered': record.fields['Products Ordered'] || '',
                        'Total Price': record.fields['Total Price'] || '',
                        'Order Date': record.fields['Order Date'] || ''
                    }).replace(/'/g, "\\'")}'>
            `;
            
            // Format products data
            let productsDisplay = 'N/A';
            if (record.fields['Products Ordered']) {
                try {
                    // Check if Products Ordered is an array
                    if (Array.isArray(record.fields['Products Ordered'])) {
                        productsDisplay = record.fields['Products Ordered'].join(', ');
                    } else {
                        productsDisplay = record.fields['Products Ordered'];
                    }
                } catch (e) {
                    console.error('Error formatting products:', e);
                    productsDisplay = 'Error displaying products';
                }
            }
            
            // Create data cells
            const cells = [
                record.fields['Order ID'] || 'N/A',
                record.fields['Customer ID'] || 'N/A',
                productsDisplay,
                `SGD ${formatCurrency(record.fields['Total Price'] || 0)}`,
                record.fields['Order Date'] || 'N/A'
            ].map(content => {
                const cell = document.createElement('td');
                cell.textContent = content;
                return cell;
            });
            
            // Create actions cell
            const actionsCell = document.createElement('td');
            actionsCell.innerHTML = `
                <button class="btn btn-sm btn-primary" onclick="viewOrderDetails('${record.id}')" data-bs-toggle="modal" data-bs-target="#orderDetailsModal">
                    <i class="bx bx-show"></i> View Details
                </button>
            `;
            
            // Append all cells to the row
            row.appendChild(checkboxCell);
            cells.forEach(cell => row.appendChild(cell));
            row.appendChild(actionsCell);
            
            tbody.appendChild(row);
        });

        // Initialize DataTable with fixed page length and pagination
        if ($.fn.DataTable.isDataTable('#ordersTable')) {
            $('#ordersTable').DataTable().destroy();
        }
        
        $('#ordersTable').DataTable({
            retrieve: true,
            pageLength: 10, // Fixed number of entries per page
            lengthChange: false, // Remove the entries per page dropdown
            searching: true,
            ordering: true,
            info: true,
            paging: true,
            pagingType: "simple_numbers", // Show Previous, page numbers, and Next
            responsive: true,
            order: [[4, 'desc']], // Sort by Order Date by default
            columnDefs: [
                {
                    targets: [2], // Products Ordered column
                    width: '25%',
                    render: function(data, type, row) {
                        if (type === 'display') {
                            return `<div class="text-truncate" style="max-width: 200px;">${data}</div>`;
                        }
                        return data;
                    }
                },
                {
                    targets: [5], // Actions column
                    orderable: false,
                    searchable: false,
                    width: '10%'
                }
            ],
            language: {
                paginate: {
                    previous: "Previous",
                    next: "Next"
                },
                info: "Showing _START_ to _END_ of _TOTAL_ entries",
                infoEmpty: "Showing 0 to 0 of 0 entries",
                zeroRecords: "No matching records found",
                search: "Search:"
            },
            dom: "<'row'<'col-sm-12 col-md-6'f><'col-sm-12 col-md-6'>>" +
                 "<'row'<'col-sm-12'tr>>" +
                 "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>"
        });

        // Add tooltip initialization
        $('[title]').tooltip({
            placement: 'top',
            html: true
        });

        // Setup checkbox handlers
        setupCheckboxHandlers();

    } catch (error) {
        console.error('Error loading orders:', error);
        const tbody = document.getElementById('orderList');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-danger">
                        <i class="bx bx-error-circle"></i> Error loading orders: ${error.message}
                    </td>
                </tr>
            `;
        }
    }
}

// Setup checkbox handlers
function setupCheckboxHandlers() {
    const selectAllCheckbox = document.getElementById('selectAllOrders');
    const orderCheckboxes = document.getElementsByClassName('order-checkbox');
    const downloadSelectedBtn = document.getElementById('downloadSelectedCSV');

    // Handle "Select All" checkbox
    selectAllCheckbox.addEventListener('change', function() {
        Array.from(orderCheckboxes).forEach(checkbox => {
            checkbox.checked = this.checked;
        });
        updateDownloadButtonState();
    });

    // Handle individual checkboxes
    Array.from(orderCheckboxes).forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            updateDownloadButtonState();
            // Update "Select All" checkbox state
            selectAllCheckbox.checked = Array.from(orderCheckboxes)
                .every(cb => cb.checked);
        });
    });
}

// Update download button state
function updateDownloadButtonState() {
    const downloadBtn = document.getElementById('downloadSelectedCSV');
    const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
    
    downloadBtn.disabled = checkedBoxes.length === 0;
    if (checkedBoxes.length > 0) {
        downloadBtn.onclick = () => downloadSelectedCSV();
    }
}

// Function to download selected orders as CSV
async function downloadSelectedCSV() {
    try {
        // Get all checked checkboxes
        const checkedBoxes = document.querySelectorAll('.order-checkbox:checked');
        
        if (checkedBoxes.length === 0) {
            showAlert('Please select at least one order to download', 'warning');
            return;
        }

        // Get the data directly from the checkboxes
        const selectedOrders = Array.from(checkedBoxes).map(checkbox => {
            const orderData = JSON.parse(checkbox.getAttribute('data-order-data'));
            return {
                'Order ID': orderData['Order ID'] || '',
                'Customer ID': orderData['Customer ID'] || '',
                'Products Ordered': Array.isArray(orderData['Products Ordered']) ? 
                    orderData['Products Ordered'].join('; ') : (orderData['Products Ordered'] || ''),
                'Total Price': orderData['Total Price'] || '0',
                'Order Date': orderData['Order Date'] || ''
            };
        });

        // Convert to CSV
        const csvContent = convertToCSV(selectedOrders);
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `selected_orders_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert('Selected orders downloaded successfully', 'success');

    } catch (error) {
        console.error('Error downloading selected orders:', error);
        showAlert('Error downloading selected orders: ' + error.message, 'danger');
    }
}

// Function to download all orders as CSV
async function downloadAllCSV() {
    try {
        // Fetch all orders from Airtable with all fields
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Orders?maxRecords=1000`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch orders');
        
        const data = await response.json();
        
        if (!data.records || data.records.length === 0) {
            showAlert('No orders found to download', 'warning');
            return;
        }

        // Format the data for CSV
        const formattedOrders = data.records.map(record => ({
            'Order ID': record.fields['Order ID'] || '',
            'Customer ID': record.fields['Customer ID'] || '',
            'Products Ordered': Array.isArray(record.fields['Products Ordered']) ? 
                record.fields['Products Ordered'].join('; ') : (record.fields['Products Ordered'] || ''),
            'Total Price': record.fields['Total Price'] || '0',
            'Order Date': record.fields['Order Date'] || '',
            // Add any additional fields you want to include
        }));

        // Convert to CSV
        const csvContent = convertToCSV(formattedOrders);
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `all_orders_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert('All orders downloaded successfully', 'success');

    } catch (error) {
        console.error('Error downloading all orders:', error);
        showAlert('Error downloading all orders: ' + error.message, 'danger');
    }
}

// Helper function to convert data to CSV
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = [
        headers.join(','), // Header row
        ...data.map(row => 
            headers.map(header => {
                let cell = row[header] || '';
                // Handle arrays and objects
                if (typeof cell === 'object') {
                    cell = JSON.stringify(cell);
                }
                // Escape quotes and wrap in quotes if contains comma, newline, or quotes
                if (cell.toString().includes('"') || cell.toString().includes(',') || 
                    cell.toString().includes('\n') || cell.toString().includes(';')) {
                    cell = `"${cell.toString().replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')
        )
    ];
    
    return rows.join('\n');
}

// Make functions globally accessible
window.downloadSelectedCSV = downloadSelectedCSV;
window.downloadAllCSV = downloadAllCSV;

// Function to view order details
async function viewOrderDetails(recordId) {
    try {
        console.log('Fetching order details for:', recordId);
        
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Orders/${recordId}`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch order details');
        
        const data = await response.json();
        const orderData = data.fields;
        console.log('Order details:', orderData);

        // Get the modal element
        const modal = document.getElementById('orderDetailsModal');
        if (!modal) {
            throw new Error('Modal element not found');
        }

        // Update the fields in the modal
        const orderIdField = modal.querySelector('#orderIdField');
        const customerIdField = modal.querySelector('#customerIdField');
        const productsField = modal.querySelector('#productsField');
        const totalPriceField = modal.querySelector('#totalPriceField');
        const orderDateField = modal.querySelector('#orderDateField');

        if (orderIdField) orderIdField.textContent = orderData['Order ID'] || 'N/A';
        if (customerIdField) customerIdField.textContent = orderData['Customer ID'] || 'N/A';
        if (productsField) productsField.textContent = Array.isArray(orderData['Products Ordered']) ? 
            orderData['Products Ordered'].join(', ') : (orderData['Products Ordered'] || 'N/A');
        if (totalPriceField) totalPriceField.textContent = `SGD ${formatCurrency(orderData['Total Price'] || 0)}`;
        if (orderDateField) orderDateField.textContent = orderData['Order Date'] || 'N/A';

        // Show the modal
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

    } catch (error) {
        console.error('Error viewing order details:', error);
        showAlert('Error loading order details: ' + error.message, 'danger');
    }
}

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

    // Helper function to format currency
    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    }

    // Helper function to show alerts
    function showAlert(message, type = 'info') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Find or create alerts container
        let alertsContainer = document.getElementById('alertsContainer');
        if (!alertsContainer) {
            alertsContainer = document.createElement('div');
            alertsContainer.id = 'alertsContainer';
            alertsContainer.style.position = 'fixed';
            alertsContainer.style.top = '20px';
            alertsContainer.style.right = '20px';
            alertsContainer.style.zIndex = '1050';
            document.body.appendChild(alertsContainer);
        }
        
        alertsContainer.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
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
            await loadUserAccounts();
            
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

    // Update the editAccount function
    function editAccount(userId) {
        console.log('Editing account:', userId);
        
        // Show loading state in the table
        const editButton = document.querySelector(`button[onclick="editAccount('${userId}')"]`);
        const originalContent = editButton.innerHTML;
        editButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i>';
        editButton.disabled = true;

        // Fetch user data
        fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch user data');
            return response.json();
        })
        .then(data => {
            // Create modal if it doesn't exist
            let modal = document.getElementById('editUserModal');
            if (!modal) {
                document.body.insertAdjacentHTML('beforeend', `
                    <div class="modal fade" id="editUserModal" tabindex="-1">
                        <div class="modal-dialog">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Edit User Account</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <form id="editUserForm">
                                        <input type="hidden" id="editUserId">
                                        <div class="mb-3">
                                            <label class="form-label">Username</label>
                                            <input type="text" class="form-control" id="editUsername" required>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Customer ID</label>
                                            <input type="text" class="form-control" id="editCustomerId">
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Role</label>
                                            <select class="form-select" id="editRole" required>
                                                <option value="user">User</option>
                                                <option value="sub-admin">Sub-admin</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                        <div class="mb-3">
                                            <label class="form-label">Status</label>
                                            <select class="form-select" id="editStatus" required>
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                        </div>
                                    </form>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                    <button type="button" class="btn btn-primary" onclick="saveUserEdit()">Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `);
                modal = document.getElementById('editUserModal');
            }

            // Populate form with user data
            document.getElementById('editUserId').value = userId;
            document.getElementById('editUsername').value = data.fields.Username || '';
            document.getElementById('editCustomerId').value = data.fields.CustomerID || '';
            document.getElementById('editRole').value = data.fields.Role || 'user';
            document.getElementById('editStatus').value = data.fields.Status || 'active';

            // Show modal
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            showAlert('Error loading user data: ' + error.message, 'danger');
        })
        .finally(() => {
            // Reset button state
            editButton.innerHTML = originalContent;
            editButton.disabled = false;
        });
    }

    // Add the saveUserEdit function
    async function saveUserEdit() {
        const userId = document.getElementById('editUserId').value;
        const submitButton = document.querySelector('#editUserModal .btn-primary');
        const originalContent = submitButton.innerHTML;
        
        try {
            // Show loading state
            submitButton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';
            submitButton.disabled = true;

            // Prepare user data
            const userData = {
                fields: {
                    Username: document.getElementById('editUsername').value,
                    CustomerID: document.getElementById('editCustomerId').value,
                    Role: document.getElementById('editRole').value,
                    Status: document.getElementById('editStatus').value
                }
            };

            // Send update request
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) throw new Error('Failed to update user');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editUserModal'));
            modal.hide();

            // Refresh table
            await loadUserAccounts();

            // Show success message
            showAlert('User account updated successfully', 'success');
        } catch (error) {
            console.error('Error updating user:', error);
            showAlert('Error updating user: ' + error.message, 'danger');
        } finally {
            // Reset button state
            submitButton.innerHTML = originalContent;
            submitButton.disabled = false;
        }
    }

    // Make functions globally accessible
    window.editAccount = editAccount;
    window.saveUserEdit = saveUserEdit;

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
            loadUserAccounts();
            showAlert('Account deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting account:', error);
            showAlert('Failed to delete account: ' + error.message, 'danger');
        }
    }

    // Make deleteAccount function globally accessible
    window.deleteAccount = deleteAccount;

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
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3 class="mb-0">Products</h3>
                <button class="btn btn-primary" onclick="showCreateProductModal()">
                    <i class="bx bx-plus"></i> Add New Product
                </button>
            </div>
            <div class="table-responsive">
                <table id="productsTable" class="table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="productList">
                        <tr>
                            <td colspan="3" class="text-center">
                                <i class="bx bx-loader-alt bx-spin"></i> Loading products...
                            </td>
                        </tr>
                    </tbody>
                </table>
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

            const tbody = document.getElementById('productList');

            if (!data.records || data.records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center">No products found</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            
            data.records.forEach(product => {
                const row = document.createElement('tr');
                
                // Product cell with image and name
                const productCell = document.createElement('td');
                productCell.innerHTML = `
                    <div class="product-info">
                        <div class="product-img-container">
                            <img 
                                src="${product.fields.ImageURL || 'https://via.placeholder.com/50?text=No+Image'}" 
                                class="product-img"
                                onerror="this.src='https://via.placeholder.com/50?text=No+Image'"
                                alt="${product.fields.Name || 'Product'}"
                            >
                        </div>
                        <p class="product-name">${product.fields.Name || 'Unnamed Product'}</p>
                    </div>
                `;
                
                // Price cell
                const priceCell = document.createElement('td');
                priceCell.textContent = product.fields.Price ? 
                    `$${parseFloat(product.fields.Price).toFixed(2)}` : 
                    'N/A';
                
                // Actions cell
                const actionsCell = document.createElement('td');
                actionsCell.className = 'text-end';
                actionsCell.innerHTML = `
                    <div class="btn-group">
                        <button class="btn btn-sm btn-primary" onclick="editProduct('${product.id}')">
                            <i class="bx bx-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger ms-2" onclick="deleteProduct('${product.id}')">
                            <i class="bx bx-trash"></i> Delete
                        </button>
                    </div>
                `;
                
                // Append all cells to the row
                row.appendChild(productCell);
                row.appendChild(priceCell);
                row.appendChild(actionsCell);
                
                tbody.appendChild(row);
            });

            // Update DataTable
            if (productTable) {
                productTable.destroy();
            }
            
            productTable = $('#productsTable').DataTable({
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
                responsive: true,
                columnDefs: [
                    { orderable: false, targets: -1 } // Disable sorting for actions column
                ]
            });

        } catch (error) {
            console.error('Error loading products:', error);
            const tbody = document.getElementById('productList');
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-danger">
                        <i class="bx bx-error-circle"></i> Error loading products: ${error.message}
                    </td>
                </tr>
            `;
        }
    }

    // Function to handle editing a product
    async function editProduct(productId) {
        console.log('Editing product:', productId);
        
        try {
            // Fetch product data
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Products/${productId}`, {
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch product data');
            
            const product = await response.json();
            
            // Remove existing modal if it exists
            const existingModal = document.getElementById('editProductModal');
            if (existingModal) {
                existingModal.remove();
            }

            // Create new modal
            const modalHTML = `
                <div class="modal fade" id="editProductModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Edit Product</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="editProductForm">
                                    <input type="hidden" id="editProductId" value="${productId}">
                                    <div class="mb-4">
                                        <label for="editProductName" class="form-label">Product Name</label>
                                        <input type="text" class="form-control border-0 bg-light" id="editProductName" 
                                            value="${product.fields.Name || ''}" required>
                                    </div>
                                    <div class="mb-4">
                                        <label for="editProductPrice" class="form-label">Price</label>
                                        <input type="number" class="form-control border-0 bg-light" id="editProductPrice" 
                                            value="${product.fields.Price || ''}" step="0.01" required>
                                    </div>
                                    <div class="mb-4">
                                        <label for="editProductImage" class="form-label">Image URL</label>
                                        <input type="url" class="form-control border-0 bg-light" id="editProductImage" 
                                            value="${product.fields.ImageURL || ''}"
                                            onchange="handleImagePreview(this)">
                                    </div>
                                    <div class="mb-4">
                                        <div id="imagePreviewContainer" style="display: ${product.fields.ImageURL ? 'block' : 'none'}">
                                            <img id="imagePreview" class="img-fluid rounded" 
                                                src="${product.fields.ImageURL || ''}" 
                                                style="max-height: 200px;">
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="saveProductEdit()">
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Initialize and show modal
            const modal = document.getElementById('editProductModal');
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();

        } catch (error) {
            console.error('Error fetching product:', error);
            showAlert('Error loading product data: ' + error.message, 'danger');
        }
    }

    // Function to save product edits
    async function saveProductEdit() {
        const productId = document.getElementById('editProductId').value;
        const submitButton = document.querySelector('#editProductModal .btn-primary');
        const spinner = submitButton.querySelector('.spinner-border');
        
        // Show loading state
        submitButton.disabled = true;
        spinner.classList.remove('d-none');

        try {
            const productData = {
                fields: {
                    Name: document.getElementById('editProductName').value,
                    Price: parseFloat(document.getElementById('editProductPrice').value),
                    ImageURL: document.getElementById('editProductImage').value
                }
            };

            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Products/${productId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) throw new Error('Failed to update product');

            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
            modal.hide();

            // Refresh products table
            await loadProducts();

            showAlert('Product updated successfully', 'success');
        } catch (error) {
            console.error('Error updating product:', error);
            showAlert('Error updating product: ' + error.message, 'danger');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            spinner.classList.add('d-none');
        }
    }

    // Helper function for image preview
    function handleImagePreview(input) {
        const previewContainer = document.getElementById('imagePreviewContainer');
        const preview = document.getElementById('imagePreview');
        
        if (input.value) {
            preview.src = input.value;
            preview.onload = function() {
                previewContainer.style.display = 'block';
            };
            preview.onerror = function() {
                previewContainer.style.display = 'none';
                showAlert('Invalid image URL', 'warning');
            };
        } else {
            previewContainer.style.display = 'none';
        }
    }

    // Make functions globally accessible
    window.editProduct = editProduct;
    window.saveProductEdit = saveProductEdit;
    window.handleImagePreview = handleImagePreview;

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

    // Add this new function to load order summary
    function loadOrderSummary() {
        console.log('Loading order summary...');

        // Remove existing custom style if it exists
        const existingStyle = document.getElementById('orderSummaryStyles');
        if (existingStyle) {
            existingStyle.remove();
        }

        // Add custom CSS with unique ID
        const customStyle = document.createElement('style');
        customStyle.id = 'orderSummaryStyles';
        customStyle.textContent = `
            .select-checkbox {
                text-align: center;
                vertical-align: middle !important;
            }
            .select-checkbox:before {
                content: '';
                width: 16px;
                height: 16px;
                border: 1px solid #aaa;
                border-radius: 3px;
                display: inline-block;
                position: relative;
                vertical-align: middle;
                cursor: pointer;
            }
            .selected .select-checkbox:before {
                background-color: #2196F3;
                border-color: #2196F3;
            }
            .selected .select-checkbox:after {
                content: '';
                position: absolute;
                display: inline-block;
                width: 5px;
                height: 10px;
                border: solid white;
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
                margin-left: -12px;
                margin-top: 2px;
            }
            table.dataTable tbody td {
                vertical-align: middle;
            }
            .dataTables_scroll {
                margin-bottom: 10px;
            }
        `;
        document.head.appendChild(customStyle);

        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="container-fluid">
                <h3 class="mb-4">Order Summary</h3>
                <div class="row">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-body">
                                <div class="mb-3 d-flex justify-content-between align-items-center">
                                    <button id="downloadSelectedSummary" class="btn btn-primary" disabled>
                                        <i class="bx bx-download"></i> Download Selected
                                    </button>
                                    <button id="downloadAllSummary" class="btn btn-success">
                                        <i class="bx bx-download"></i> Download All
                                    </button>
                                </div>
                                <div class="table-responsive">
                                    <table id="orderSummaryTable" class="table table-striped" style="width: 100%">
                                        <thead>
                                            <tr>
                                                <th style="width: 30px !important;"></th>
                                                <th style="width: 50px !important;">#</th>
                                                <th style="width: 200px !important;">Item No.</th>
                                                <th style="width: 300px !important;">Item Description</th>
                                                <th style="width: 120px !important;">Customer Code</th>
                                                <th style="width: 200px !important;">Customer Name</th>
                                                <th style="width: 120px !important;">Annual Total</th>
                                                <th style="width: 100px !important;">January (2024) - Quantity</th>
                                                <th style="width: 120px !important;">January (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">February (2024) - Quantity</th>
                                                <th style="width: 120px !important;">February (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">March (2024) - Quantity</th>
                                                <th style="width: 120px !important;">March (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">April (2024) - Quantity</th>
                                                <th style="width: 120px !important;">April (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">May (2024) - Quantity</th>
                                                <th style="width: 120px !important;">May (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">June (2024) - Quantity</th>
                                                <th style="width: 120px !important;">June (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">July (2024) - Quantity</th>
                                                <th style="width: 120px !important;">July (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">August (2024) - Quantity</th>
                                                <th style="width: 120px !important;">August (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">September (2024) - Quantity</th>
                                                <th style="width: 120px !important;">September (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">October (2024) - Quantity</th>
                                                <th style="width: 120px !important;">October (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">November (2024) - Quantity</th>
                                                <th style="width: 120px !important;">November (2024) - Sales Amount</th>
                                                <th style="width: 100px !important;">December (2024) - Quantity</th>
                                                <th style="width: 120px !important;">December (2024) - Sales Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody id="orderSummaryList">
                                            <tr>
                                                <td colspan="32" class="text-center">Loading summary data...</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Fetch data from OrderHistory
        fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/OrderHistory?view=Grid%20view`, {
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch order summary');
            return response.json();
        })
        .then(data => {
            console.log('Order summary data:', data);
            
            const tbody = document.getElementById('orderSummaryList');
            if (!tbody) throw new Error('Table body element not found');
            
            if (!data.records || data.records.length === 0) {
                tbody.innerHTML = '<tr><td colspan="32" class="text-center">No summary data found</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            
            data.records.forEach(record => {
                const fields = record.fields;
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td></td>
                    <td>${fields['#'] || ''}</td>
                    <td>${fields['Item No.'] || ''}</td>
                    <td>${fields['Item Description'] || ''}</td>
                    <td>${fields['Customer Code'] || ''}</td>
                    <td>${fields['Customer Name'] || ''}</td>
                    <td>${fields['Annual Total'] || '0'}</td>
                    <td>${fields['January  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['January  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['January  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['February  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['February  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['February  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['March  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['March  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['March  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['April  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['April  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['April  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['May  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['May  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['May  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['June  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['June  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['June  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['July  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['July  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['July  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['August  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['August  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['August  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['September  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['September  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['September  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['October  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['October  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['October  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['November  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['November  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['November  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                    <td>${fields['December  (2024) - Quantity'] || '0'}</td>
                    <td>${fields['December  (2024) - Sales Amount'] ? `SGD ${formatCurrency(fields['December  (2024) - Sales Amount'])}` : 'SGD 0.00'}</td>
                `;
                tbody.appendChild(row);
            });

            // Initialize DataTable
            if ($.fn.DataTable.isDataTable('#orderSummaryTable')) {
                $('#orderSummaryTable').DataTable().destroy();
            }
            
            $('#orderSummaryTable').DataTable({
                pageLength: 25,
                lengthMenu: [[25, 50, 100, -1], [25, 50, 100, "All"]],
                responsive: false,
                order: [[1, 'asc']],
                dom: '<"top"fl>rt<"bottom"ip><"clear">',
                scrollX: true,
                fixedColumns: {
                    left: 4
                },
                columnDefs: [
                    {
                        targets: 0,
                        orderable: false,
                        className: 'dt-center',
                        data: null,
                        defaultContent: '<input type="checkbox" class="form-check-input summary-checkbox">'
                    },
                    {
                        targets: '_all',
                        className: 'text-nowrap'
                    }
                ],
                autoWidth: false,
                drawCallback: function(settings) {
                    // Add select all checkbox to header
                    const headerCell = document.querySelector('#orderSummaryTable thead tr th:first-child');
                    if (headerCell && !headerCell.querySelector('input[type="checkbox"]')) {
                        headerCell.innerHTML = '<input type="checkbox" class="form-check-input" id="selectAllSummary">';
                    }

                    // Setup checkbox functionality
                    const selectAllCheckbox = document.getElementById('selectAllSummary');
                    const downloadSelectedBtn = document.getElementById('downloadSelectedSummary');
                    const checkboxes = document.querySelectorAll('.summary-checkbox');

                    if (selectAllCheckbox) {
                        // Remove existing event listeners
                        selectAllCheckbox.replaceWith(selectAllCheckbox.cloneNode(true));
                        const newSelectAllCheckbox = document.getElementById('selectAllSummary');
                        
                        // Add new event listener
                        newSelectAllCheckbox.addEventListener('change', function() {
                            checkboxes.forEach(checkbox => {
                                checkbox.checked = this.checked;
                            });
                            downloadSelectedBtn.disabled = !this.checked;
                        });
                    }

                    // Setup individual checkbox functionality
                    checkboxes.forEach(checkbox => {
                        // Remove existing event listeners
                        checkbox.replaceWith(checkbox.cloneNode(true));
                    });

                    // Add new event listeners to all checkboxes
                    document.querySelectorAll('.summary-checkbox').forEach(checkbox => {
                        checkbox.addEventListener('change', function() {
                            const allCheckboxes = document.querySelectorAll('.summary-checkbox');
                            const checkedCount = document.querySelectorAll('.summary-checkbox:checked').length;
                            const selectAllCheckbox = document.getElementById('selectAllSummary');
                            
                            if (selectAllCheckbox) {
                                selectAllCheckbox.checked = checkedCount === allCheckboxes.length;
                                selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
                            }
                            downloadSelectedBtn.disabled = checkedCount === 0;
                        });
                    });
                }
            });

            // Add event listeners for download buttons
            document.getElementById('downloadAllSummary').addEventListener('click', downloadAllSummary);
            document.getElementById('downloadSelectedSummary').addEventListener('click', downloadSelectedSummary);
        })
        .catch(error => {
            console.error('Error loading order summary:', error);
            const tbody = document.getElementById('orderSummaryList');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="32" class="text-center text-danger">
                            <i class="bx bx-error-circle"></i> Error loading order summary: ${error.message}
                        </td>
                    </tr>
                `;
            }
        });
    }

    // Add event listener for the sidebar link (this should be in your initialization code)
    document.addEventListener('DOMContentLoaded', function() {
        // Add click handlers for all navigation items
        const navItems = document.querySelectorAll('.nav-link');
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Remove active class from all items
                navItems.forEach(nav => nav.classList.remove('active'));
                // Add active class to clicked item
                this.classList.add('active');
            });
        });
    });

    // Add this function to refresh Order Summary
    function refreshOrderSummary() {
        if (document.getElementById('orderSummaryTable')) {
            loadOrderSummary();
        }
    }

    // Update the processOrder function
    async function processOrder(event) {
        event.preventDefault();
        
        try {
            // ... existing order processing code ...

            // After successful order processing
            showAlert('Order processed successfully!', 'success');
            
            // Refresh both the orders table and order summary
            loadOrders();
            refreshOrderSummary();
            
            // Clear the form
            orderForm.reset();
            
            // Close the modal if it exists
            const modal = document.getElementById('orderModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            }

        } catch (error) {
            console.error('Error processing order:', error);
            showAlert('Error processing order: ' + error.message, 'danger');
        }
    }

    // Make sure the function is globally accessible
    window.refreshOrderSummary = refreshOrderSummary;
    window.processOrder = processOrder;

    // Add checkbox selection functionality to Order Summary
    function setupOrderSummaryCheckboxes() {
        // Add checkbox column to table header
        const headerRow = document.querySelector('#orderSummaryTable thead tr');
        if (headerRow) {
            headerRow.insertAdjacentHTML('afterbegin', `
                <th>
                    <input type="checkbox" class="form-check-input" id="selectAllSummary">
                </th>
            `);
        }

        // Add checkbox column to each data row
        const tbody = document.querySelector('#orderSummaryTable tbody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                row.insertAdjacentHTML('afterbegin', `
                    <td>
                        <input type="checkbox" class="form-check-input summary-checkbox">
                    </td>
                `);
            });
        }

        // Setup select all functionality
        const selectAllCheckbox = document.getElementById('selectAllSummary');
        const summaryCheckboxes = document.querySelectorAll('.summary-checkbox');
        const downloadSelectedBtn = document.getElementById('downloadSelectedSummary');

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                summaryCheckboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
                downloadSelectedBtn.disabled = !this.checked;
            });
        }

        // Setup individual checkbox functionality
        summaryCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const checkedCount = document.querySelectorAll('.summary-checkbox:checked').length;
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = checkedCount === summaryCheckboxes.length;
                    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < summaryCheckboxes.length;
                }
                downloadSelectedBtn.disabled = checkedCount === 0;
            });
        });

        // Setup download functionality
        if (downloadSelectedBtn) {
            downloadSelectedBtn.addEventListener('click', downloadSelectedSummary);
        }
    }

    // Function to download selected summary rows
    function downloadSelectedSummary() {
        const selectedRows = document.querySelectorAll('.summary-checkbox:checked');
        if (selectedRows.length === 0) {
            showAlert('Please select at least one row to download', 'warning');
            return;
        }

        const data = [];
        selectedRows.forEach(checkbox => {
            const row = checkbox.closest('tr');
            const cells = row.querySelectorAll('td');
            const rowData = {
                '#': cells[1].textContent,
                'Item No.': cells[2].textContent,
                'Item Description': cells[3].textContent,
                'Customer Code': cells[4].textContent,
                'Customer Name': cells[5].textContent,
                'Annual Total': cells[6].textContent,
                'January Quantity': cells[7].textContent,
                'January Sales Amount': cells[8].textContent.replace('SGD ', ''),
                'February Quantity': cells[9].textContent,
                'February Sales Amount': cells[10].textContent.replace('SGD ', ''),
                'March Quantity': cells[11].textContent,
                'March Sales Amount': cells[12].textContent.replace('SGD ', ''),
                'April Quantity': cells[13].textContent,
                'April Sales Amount': cells[14].textContent.replace('SGD ', ''),
                'May Quantity': cells[15].textContent,
                'May Sales Amount': cells[16].textContent.replace('SGD ', ''),
                'June Quantity': cells[17].textContent,
                'June Sales Amount': cells[18].textContent.replace('SGD ', ''),
                'July Quantity': cells[19].textContent,
                'July Sales Amount': cells[20].textContent.replace('SGD ', ''),
                'August Quantity': cells[21].textContent,
                'August Sales Amount': cells[22].textContent.replace('SGD ', ''),
                'September Quantity': cells[23].textContent,
                'September Sales Amount': cells[24].textContent.replace('SGD ', ''),
                'October Quantity': cells[25].textContent,
                'October Sales Amount': cells[26].textContent.replace('SGD ', ''),
                'November Quantity': cells[27].textContent,
                'November Sales Amount': cells[28].textContent.replace('SGD ', ''),
                'December Quantity': cells[29].textContent,
                'December Sales Amount': cells[30].textContent.replace('SGD ', '')
            };
            data.push(rowData);
        });

        // Convert to CSV
        const csvContent = convertToCSV(data);
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `order_summary_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert('Selected summary rows downloaded successfully', 'success');
    }

    // Make functions globally accessible
    window.setupOrderSummaryCheckboxes = setupOrderSummaryCheckboxes;
    window.downloadSelectedSummary = downloadSelectedSummary;

    // Function to download all summary data
    function downloadAllSummary() {
        try {
            const table = $('#orderSummaryTable').DataTable();
            const downloadAllBtn = document.getElementById('downloadAllSummary');
            const originalText = downloadAllBtn.innerHTML;
            
            // Show loading state
            downloadAllBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Downloading...';
            downloadAllBtn.disabled = true;

            // Get all data (not just current page)
            const allData = table.data().toArray();
            
            if (allData.length === 0) {
                throw new Error('No data available to download');
            }

            // Prepare CSV data
            const data = [];
            allData.forEach(row => {
                const rowData = {
                    '#': row[1],
                    'Item No.': row[2],
                    'Item Description': row[3],
                    'Customer Code': row[4],
                    'Customer Name': row[5],
                    'Annual Total': row[6],
                    'January Quantity': row[7],
                    'January Sales Amount': row[8].replace('SGD ', ''),
                    'February Quantity': row[9],
                    'February Sales Amount': row[10].replace('SGD ', ''),
                    'March Quantity': row[11],
                    'March Sales Amount': row[12].replace('SGD ', ''),
                    'April Quantity': row[13],
                    'April Sales Amount': row[14].replace('SGD ', ''),
                    'May Quantity': row[15],
                    'May Sales Amount': row[16].replace('SGD ', ''),
                    'June Quantity': row[17],
                    'June Sales Amount': row[18].replace('SGD ', ''),
                    'July Quantity': row[19],
                    'July Sales Amount': row[20].replace('SGD ', ''),
                    'August Quantity': row[21],
                    'August Sales Amount': row[22].replace('SGD ', ''),
                    'September Quantity': row[23],
                    'September Sales Amount': row[24].replace('SGD ', ''),
                    'October Quantity': row[25],
                    'October Sales Amount': row[26].replace('SGD ', ''),
                    'November Quantity': row[27],
                    'November Sales Amount': row[28].replace('SGD ', ''),
                    'December Quantity': row[29],
                    'December Sales Amount': row[30].replace('SGD ', '')
                };
                data.push(rowData);
            });

            // Generate CSV
            const csvContent = convertToCSV(data);
            
            // Create and trigger download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `complete_order_summary_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showAlert('Complete order summary downloaded successfully', 'success');
        } catch (error) {
            console.error('Download error:', error);
            showAlert('Error downloading data: ' + error.message, 'danger');
        } finally {
            // Restore button state
            const downloadAllBtn = document.getElementById('downloadAllSummary');
            downloadAllBtn.innerHTML = '<i class="bx bx-download"></i> Download All';
            downloadAllBtn.disabled = false;
        }
    }

    // Update the convertToCSV helper function
    function convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [
            headers.join(','), // Header row
            ...data.map(row => 
                headers.map(header => {
                    let cell = row[header] || '';
                    // Escape quotes and wrap in quotes if contains comma or newline
                    if (cell.toString().includes(',') || cell.toString().includes('\n') || cell.toString().includes('"')) {
                        cell = `"${cell.toString().replace(/"/g, '""')}"`;
                    }
                    return cell;
                }).join(',')
            )
        ];
        
        return csvRows.join('\n');
    }

    // Make functions globally accessible
    window.downloadAllSummary = downloadAllSummary;

    // Function to download filtered summary data
    function downloadFilteredSummary() {
        const table = $('#orderSummaryTable').DataTable();
        const filteredData = [];
        
        table.rows({ search: 'applied' }).every(function() {
            const data = this.data();
            const rowData = {
                '#': data[1],
                'Item No.': data[2],
                'Item Description': data[3],
                'Customer Code': data[4],
                'Customer Name': data[5],
                'Annual Total': data[6],
                'January Quantity': data[7],
                'January Sales Amount': data[8].replace('SGD ', ''),
                'February Quantity': data[9],
                'February Sales Amount': data[10].replace('SGD ', ''),
                'March Quantity': data[11],
                'March Sales Amount': data[12].replace('SGD ', ''),
                'April Quantity': data[13],
                'April Sales Amount': data[14].replace('SGD ', ''),
                'May Quantity': data[15],
                'May Sales Amount': data[16].replace('SGD ', ''),
                'June Quantity': data[17],
                'June Sales Amount': data[18].replace('SGD ', ''),
                'July Quantity': data[19],
                'July Sales Amount': data[20].replace('SGD ', ''),
                'August Quantity': data[21],
                'August Sales Amount': data[22].replace('SGD ', ''),
                'September Quantity': data[23],
                'September Sales Amount': data[24].replace('SGD ', ''),
                'October Quantity': data[25],
                'October Sales Amount': data[26].replace('SGD ', ''),
                'November Quantity': data[27],
                'November Sales Amount': data[28].replace('SGD ', ''),
                'December Quantity': data[29],
                'December Sales Amount': data[30].replace('SGD ', '')
            };
            filteredData.push(rowData);
        });

        downloadCSV(filteredData, 'filtered_order_summary');
    }

    // Helper function to download CSV
    function downloadCSV(data, prefix) {
        if (data.length === 0) {
            showAlert('No data to download', 'warning');
            return;
        }

        const csvContent = convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${prefix}_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showAlert(`${prefix.replace('_', ' ')} downloaded successfully`, 'success');
    }

    // Make functions globally accessible
    window.downloadAllSummary = downloadAllSummary;
    window.downloadFilteredSummary = downloadFilteredSummary;
    window.downloadCSV = downloadCSV;

    // Update the loadUserChange function
    function loadUserChange() {
        console.log('Loading user change...');
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="container-fluid">
                <h3 class="mb-4">User Change</h3>
                <div class="row">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-body">
                                <form id="userChangeForm">
                                    <div class="mb-3">
                                        <label for="customerCode" class="form-label">Customer Code</label>
                                        <input type="text" class="form-control" id="customerCode" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="oldUsername" class="form-label">Old Username</label>
                                        <input type="text" class="form-control" id="oldUsername" required>
                                    </div>
                                    <div class="mb-3">
                                        <label for="newUsername" class="form-label">New Username</label>
                                        <input type="text" class="form-control" id="newUsername" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary">Submit</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update form submission handler
        document.getElementById('userChangeForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const customerCode = document.getElementById('customerCode').value;
            const oldUsername = document.getElementById('oldUsername').value;
            const newUsername = document.getElementById('newUsername').value;

            try {
                // First, check if the customer code exists
                const customerResponse = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Customer?filterByFormula=AND({Customer Code}='${customerCode}',{Status}='Active')`, {
                    headers: {
                        'Authorization': `Bearer ${window.API_KEY}`
                    }
                });

                if (!customerResponse.ok) throw new Error('Failed to verify customer code');
                
                const customerData = await customerResponse.json();
                if (!customerData.records || customerData.records.length === 0) {
                    throw new Error('Invalid Customer Code');
                }

                // Then, check if the old username exists for this customer
                const userResponse = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/User?filterByFormula=AND({Customer Code}='${customerCode}',{Username}='${oldUsername}')`, {
                    headers: {
                        'Authorization': `Bearer ${window.API_KEY}`
                    }
                });

                if (!userResponse.ok) throw new Error('Failed to verify username');
                
                const userData = await userResponse.json();
                if (!userData.records || userData.records.length === 0) {
                    throw new Error('Invalid Old Username for this Customer Code');
                }

                // Update the username
                const updateResponse = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/User/${userData.records[0].id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${window.API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            'Username': newUsername
                        }
                    })
                });

                if (!updateResponse.ok) throw new Error('Failed to update username');

                showAlert('Username updated successfully', 'success');
                document.getElementById('userChangeForm').reset();
            } catch (error) {
                console.error('Error:', error);
                showAlert(error.message, 'danger');
            }
        });
    }

    // Update the loadUserAccounts function with more robust initialization
    async function loadUserAccounts() {
        console.log('Starting to load user accounts...');
        
        // Check if jQuery and DataTables are available
        if (typeof $ === 'undefined') {
            console.error('jQuery is not loaded');
            return;
        }

        if (typeof $.fn.DataTable === 'undefined') {
            console.error('DataTables is not loaded');
            return;
        }

        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('Main content container not found');
            return;
        }

        // First, set up the basic table structure
        mainContent.innerHTML = `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h4 class="card-title">User Accounts</h4>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table id="userAccountsTable" class="display table table-bordered table-striped">
                                        <thead>
                                            <tr>
                                                <th>Customer ID</th>
                                                <th>Customer Name</th>
                                                <th>Username</th>
                                                <th>Role</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        try {
            // Destroy existing DataTable if it exists
            const existingTable = $('#userAccountsTable').DataTable();
            if (existingTable) {
                existingTable.destroy();
            }

            // Fetch the data first
            console.log('Fetching user data...');
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users`, {
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Data fetched:', result);

            // Initialize DataTable with the fetched data
            const table = $('#userAccountsTable').DataTable({
                data: result.records,
                columns: [
                    { 
                        data: 'fields.CustomerID',
                        defaultContent: '-'
                    },
                    { 
                        data: 'fields.CustomerName',
                        defaultContent: '-'
                    },
                    { 
                        data: 'fields.Username',
                        defaultContent: '-'
                    },
                    {
                        data: 'fields.Role',
                        defaultContent: '-'
                    },
                    {
                        data: 'fields.IsDisabled',
                        render: function(data) {
                            return data ? 
                                '<span class="badge bg-danger">Disabled</span>' : 
                                '<span class="badge bg-success">Active</span>';
                        },
                        defaultContent: '-'
                    },
                    {
                        data: null,
                        orderable: false,
                        render: function(data, type, row) {
                            return `
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm ${row.fields.IsDisabled ? 'btn-success' : 'btn-warning'} toggle-status" 
                                        onclick="toggleUserStatus('${row.id}', ${row.fields.IsDisabled})"
                                        title="${row.fields.IsDisabled ? 'Enable' : 'Disable'} User">
                                        <i class="bx ${row.fields.IsDisabled ? 'bx-play-circle' : 'bx-pause-circle'}"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                        onclick="deleteUser('${row.id}')"
                                        title="Delete User">
                                        <i class="bx bx-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                    }
                ],
                responsive: true,
                dom: 'Bfrtip',
                pageLength: 10,
                order: [[2, 'asc']], // Sort by username by default
                language: {
                    emptyTable: "No users found",
                    loadingRecords: "Loading...",
                    processing: "Processing...",
                    zeroRecords: "No matching users found"
                }
            });

            console.log('Table initialized successfully');

            // Add event listener for table draw
            table.on('draw', function() {
                console.log('Table redrawn');
            });

        } catch (error) {
            console.error('Error initializing table:', error);
            mainContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="bx bx-error"></i> Error loading user accounts: ${error.message}
                </div>
            `;
        }
    }

    // Add these helper functions for the table actions
    window.toggleUserStatus = async function(id, currentlyDisabled) {
        try {
            console.log('Toggling status for user:', id, 'Currently disabled:', currentlyDisabled);
            
            // Get the user's current data
            const userResponse = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${id}`, {
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`
                }
            });

            if (!userResponse.ok) {
                throw new Error('Failed to fetch user data');
            }

            const userData = await userResponse.json();
            const username = userData.fields.Username;

            // Update the user's status
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        IsDisabled: !currentlyDisabled
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update user status');
            }

            const result = await response.json();
            console.log('Status update result:', result);

            // Refresh the table
            const table = $('#userAccountsTable').DataTable();
            const usersResponse = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users`, {
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`
                }
            });

            if (!usersResponse.ok) {
                throw new Error('Failed to refresh user data');
            }

            const usersData = await usersResponse.json();
            table.clear();
            table.rows.add(usersData.records);
            table.draw();

            // Show success message
            showAlert(`User ${username} has been ${!currentlyDisabled ? 'disabled' : 'enabled'}`, 'success');

            // If the disabled user is currently logged in, force logout
            const currentSession = getCurrentUserSession();
            if (currentSession && currentSession.id === id && !currentlyDisabled) {
                // Clear session
                window.sessionStorage.removeItem('userSession');
                window.localStorage.removeItem('userSession');
                
                // Show message and redirect after a short delay
                showAlert('Your account has been disabled. You will be redirected.', 'warning');
                setTimeout(() => {
                    window.location.href = 'restricted.html';
                }, 2000);
            }

        } catch (error) {
            console.error('Error toggling user status:', error);
            showAlert('Error updating user status: ' + error.message, 'danger');
        }
    };

    window.deleteUser = async function(id) {
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        try {
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete user');
            }

            // Refresh the table
            $('#userAccountsTable').DataTable().ajax.reload();
            
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Error deleting user: ' + error.message);
        }
    };

    // Add initialization check
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Document loaded');
        if (window.location.pathname.includes('admin.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const section = urlParams.get('section') || 'accounts';
            console.log('Loading section:', section);
            loadSection(section);
        }
    });

    // Update loadSection function
    function loadSection(sectionName) {
        console.log('Loading section:', sectionName);
        switch(sectionName) {
            case 'accounts':
                loadUserAccounts();
                break;
            case 'dashboard':
                loadDashboard();
                break;
            // ... other cases
            default:
                console.log('Unknown section:', sectionName);
                loadDashboard(); // Default to dashboard
        }
    }

    // Add admin page initialization
    function initializeAdminPage() {
        console.log('Initializing admin page');
        const session = getCurrentUserSession();
        if (!session) return;

        // Setup navigation event listeners
        setupNavigation();
        
        // Load default section or section from URL
        const urlParams = new URLSearchParams(window.location.search);
        const section = urlParams.get('section') || 'dashboard';
        loadSection(section);
    }

    // Add navigation setup
    function setupNavigation() {
        console.log('Setting up navigation');
        
        // Add click handlers to nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remove active class from all links
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                this.classList.add('active');
                
                // Get section name from data attribute or href
                const section = this.dataset.section || this.getAttribute('href').replace('#', '');
                
                // Update URL without reloading
                window.history.pushState({}, '', `?section=${section}`);
                
                // Load the section
                loadSection(section);
            });
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', function() {
            const urlParams = new URLSearchParams(window.location.search);
            const section = urlParams.get('section') || 'dashboard';
            loadSection(section);
        });
    }

    // Add placeholder functions for other sections
    function loadDashboard() {
        console.log('Loading dashboard...');
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container-fluid">
                    <h3 class="mb-4">Dashboard</h3>
                    <!-- Add your dashboard content here -->
                </div>
            `;
        }
    }

    function loadCustomers() {
        console.log('Loading customers...');
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container-fluid">
                    <h3 class="mb-4">Customers</h3>
                    <!-- Add your customers content here -->
                </div>
            `;
        }
    }

    function loadReports() {
        console.log('Loading reports...');
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container-fluid">
                    <h3 class="mb-4">Reports</h3>
                    <!-- Add your reports content here -->
                </div>
            `;
        }
    }

    function loadSettings() {
        console.log('Loading settings...');
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.innerHTML = `
                <div class="container-fluid">
                    <h3 class="mb-4">Settings</h3>
                    <!-- Add your settings content here -->
                </div>
            `;
        }
    }

    // Update getCurrentUserSession to be less aggressive with redirects
    function getCurrentUserSession() {
        try {
            let sessionStr = window.sessionStorage.getItem('userSession');
            if (!sessionStr) {
                sessionStr = window.localStorage.getItem('userSession');
                if (sessionStr) {
                    window.sessionStorage.setItem('userSession', sessionStr);
                }
            }

            if (sessionStr) {
                return JSON.parse(sessionStr);
            }
            
            if (window.location.pathname.includes('admin.html')) {
                window.location.href = 'login.html';
            }
            return null;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    // Update handleLogin function to check IsDisabled field first
    async function handleLogin(event) {
        event.preventDefault();
        console.log('Login form submitted');

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            // First check if credentials exist and get IsDisabled status
            const response = await fetch(
                `${window.AIRTABLE_URL}/${window.BASE_ID}/Users?filterByFormula=AND({Username}='${username}',{Password}='${password}')`,
                {
                    headers: {
                        'Authorization': `Bearer ${window.API_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Login request failed');
            }

            const data = await response.json();
            console.log('Login response:', data);

            if (!data.records || data.records.length === 0) {
                throw new Error('Invalid credentials');
            }

            const user = data.records[0];
            console.log('User record:', user);
            console.log('IsDisabled status:', user.fields.IsDisabled);

            // Check IsDisabled field first - if true, redirect to restricted
            if (user.fields.IsDisabled === true) {
                console.log('Account is disabled, redirecting to restricted page');
                // Store username for restricted page
                sessionStorage.setItem('restrictedUser', user.fields.Username);
                // Redirect to restricted page
                window.location.href = 'restricted.html';
                return;
            }

            // Only proceed if account is not disabled
            if (!user.fields.IsDisabled) {
                console.log('Account is enabled, proceeding with login');
                
                const sessionData = {
                    id: user.id,
                    fields: {
                        Username: user.fields.Username,
                        Role: user.fields.Role,
                        CustomerID: user.fields.CustomerID,
                        CustomerName: user.fields.CustomerName,
                        IsDisabled: false
                    },
                    Role: user.fields.Role,
                    Username: user.fields.Username
                };

                // Store session
                const sessionStr = JSON.stringify(sessionData);
                window.sessionStorage.setItem('userSession', sessionStr);
                window.localStorage.setItem('userSession', sessionStr);

                // Update LastLogin
                await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${user.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${window.API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        fields: {
                            LastLogin: new Date().toISOString()
                        }
                    })
                });

                // Redirect to admin page
                window.location.href = 'admin.html';
            }

        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        }
    }

    // Add function to verify disabled status
    async function verifyAccountStatus(userId) {
        try {
            const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to verify account status');
            }

            const data = await response.json();
            return data.fields.IsDisabled === true;
        } catch (error) {
            console.error('Error verifying account status:', error);
            return false;
        }
    }

    // Update initialization for restricted page
    document.addEventListener('DOMContentLoaded', function() {
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('login.html')) {
            // Setup login form
            const loginForm = document.getElementById('loginForm');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
            }
        } else if (currentPath.includes('restricted.html')) {
            // Setup restricted page
            const restrictedUser = sessionStorage.getItem('restrictedUser');
            const messageElement = document.getElementById('restrictedMessage');
            if (messageElement && restrictedUser) {
                messageElement.textContent = `Account "${restrictedUser}" is disabled. Please contact your administrator.`;
            }
        }
    });

    // Update getCurrentUserSession to check IsDisabled
    function getCurrentUserSession() {
        try {
            let sessionStr = window.sessionStorage.getItem('userSession');
            if (!sessionStr) {
                sessionStr = window.localStorage.getItem('userSession');
            }

            if (sessionStr) {
                const session = JSON.parse(sessionStr);
                // Check if the account is disabled
                if (session.fields.IsDisabled) {
                    // Clear session if disabled
                    window.sessionStorage.removeItem('userSession');
                    window.localStorage.removeItem('userSession');
                    window.location.href = 'restricted.html';
                    return null;
                }
                return session;
            }
            return null;
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }

    // Section configuration
    const sections = {
        'products': {
            tableName: 'Products',
            displayName: 'Products Management',
            fields: ['Name', 'Price', 'ImageURL', 'CustomerID']
        },
        'orders': {
            tableName: 'Orders', // Make sure this matches your Airtable table name exactly
            displayName: 'Orders History',
            fields: ['OrderID', 'CustomerID', 'ProductsOrdered', 'TotalPrice', 'OrderDate', 'Timestamp']
        }
    };

    // Field display name mapping
    const displayNames = {
        // Product fields
        'Name': 'Name',
        'Descriptions': 'Descriptions',
        'Price': 'Price',
        'ImageURL': 'Image',
        'CustomerID': 'Customer ID',
        // Order fields
        'Customer ID': 'Customer ID',
        'Total Price': 'Total Price',
        'Order Date': 'Order Date',
        'Order ID': 'Order ID'
        // Removed announcement fields
    };

    // Initialize Airtable
    const airtableBase = new Airtable({
        apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'
    }).base('appipp8LFUGElp3Di');

    // Function to load section data
    async function loadSectionData(sectionName) {
        try {
            const section = sections[sectionName];
            if (!section) return;

            airtableBase(section.tableName).select({
                maxRecords: 100,
                view: "Grid view"
            }).eachPage(function page(records, fetchNextPage) {
                if (sectionName === 'products') {
                    displayProducts(records);
                } else if (sectionName === 'orders') {
                    displayOrders(records);
                }
                fetchNextPage();
            }, function done(err) {
                if (err) {
                    console.error(err);
                    return;
                }
            });

        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // Function to display section data with field name mapping
    function displaySectionData(sectionName, records) {
        const section = sections[sectionName];
        const mainContent = document.querySelector('.main-content');
        
        if (!mainContent || !section) return;

        // Add date filter controls for orders only
        const dateFilterControls = sectionName === 'orders' ? `
            <div class="row mb-4">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col-auto">
                                    <select class="form-select" id="dateFilterType">
                                        <option value="all">All Records</option>
                                        <option value="today">Today</option>
                                        <option value="thisMonth">This Month</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                </div>
                                <div class="col-auto custom-date-range" style="display: none;">
                                    <input type="date" class="form-control" id="startDate">
                                </div>
                                <div class="col-auto custom-date-range" style="display: none;">
                                    <input type="date" class="form-control" id="endDate">
                                </div>
                                <div class="col-auto">
                                    <button class="btn btn-primary" onclick="applyDateFilter()">Apply Filter</button>
                                </div>
                                <div class="col-auto">
                                    <button class="btn btn-success" onclick="downloadSelectedRecords()">
                                        <i class="fas fa-download"></i> Download Selected
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

        let tableHeaders = section.fields.map(field => 
            `<th class="border">${displayNames[field] || field}</th>`
        ).join('');
        
        // Add checkbox column and Actions column for orders only
        if (sectionName === 'orders') {
            tableHeaders = `<th class="border"><input type="checkbox" id="selectAll"></th>` + tableHeaders + '<th class="border">Actions</th>';
        }

        let tableRows = records.map(record => {
            let cells = '';
            
            // Add checkbox for orders only
            if (sectionName === 'orders') {
                cells += `<td class="border"><input type="checkbox" class="record-checkbox" value="${record.id}"></td>`;
            }
            
            cells += section.fields.map(field => {
                let value = record.fields[field];
                
                if (field === 'ImageURL' && value) {
                    return `<td class="border"><img src="${value}" alt="Product" style="max-width: 50px; max-height: 50px;"></td>`;
                }
                if (field === 'Price' || field === 'Total Price') {
                    return `<td class="border">$${Number(value || 0).toFixed(2)}</td>`;
                }
                if (field === 'Order Date' || field === 'Date') {
                    return `<td class="border">${value ? new Date(value).toLocaleString() : ''}</td>`;
                }
                
                return `<td class="border">${value !== undefined ? value : ''}</td>`;
            }).join('');
            
            // Add View Details button for orders only
            if (sectionName === 'orders') {
                cells += `
                    <td class="border">
                        <button class="btn btn-sm btn-info" 
                            onclick="viewOrderDetails('${encodeURIComponent(JSON.stringify(record.fields))}')">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </td>
                `;
            }
            
            return `<tr>${cells}</tr>`;
        }).join('');

        mainContent.innerHTML = `
            <div class="container-fluid">
                <h3 class="mb-4">${section.displayName}</h3>
                ${dateFilterControls || ''}
                <div class="card">
                    <div class="card-body">
                        <style>
                            .table td, .table th {
                                border: 1px solid #dee2e6 !important;
                                padding: 12px !important;
                            }
                            .table {
                                border: 1px solid #dee2e6 !important;
                            }
                        </style>
                        <table class="table" id="${sectionName}Table">
                            <thead>
                                <tr>${tableHeaders}</tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
                ${sectionName === 'orders' ? orderDetailsModal : ''}
            </div>
        `;

        // Initialize DataTable with section-specific settings
        if (sectionName === 'orders') {
            const table = $(`#${sectionName}Table`).DataTable({
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
                responsive: true,
                order: [[4, 'desc']] // Sort by Order Date descending
            });

            // Add orders-specific event listeners
            // ... existing orders event listeners ...
        } else {
            // Simple DataTable initialization for other sections
            $(`#${sectionName}Table`).DataTable({
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]],
                responsive: true,
                order: [[0, 'asc']] // Sort by first column ascending
            });
        }
    }

    // Function to apply date filter
    function applyDateFilter() {
        const filterType = document.getElementById('dateFilterType').value;
        const table = $('#ordersTable').DataTable();
        
        table.draw(); // Clear existing filter
        
        if (filterType === 'all') {
            table.search('').draw();
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let startDate, endDate;
        
        switch(filterType) {
            case 'today':
                startDate = today;
                endDate = new Date(today);
                endDate.setDate(endDate.getDate() + 1);
                break;
                
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                break;
                
            case 'custom':
                startDate = new Date(document.getElementById('startDate').value);
                endDate = new Date(document.getElementById('endDate').value);
                endDate.setDate(endDate.getDate() + 1);
                break;
        }

        // Custom filter function
        $.fn.dataTable.ext.search.push(function(settings, data, dataIndex) {
            if (filterType === 'all') return true;
            
            const orderDate = new Date(data[3]); // Assuming Order Date is in column 3
            orderDate.setHours(0, 0, 0, 0);
            
            return orderDate >= startDate && orderDate < endDate;
        });
        
        table.draw();
    }

    // Function to download selected records
    function downloadSelectedRecords() {
        try {
            const table = $('#ordersTable').DataTable();
            const selectedRows = [];
            
            // Get all checked rows across all pages
            table.rows().every(function() {
                const $row = $(this.node());
                const checkbox = $row.find('.record-checkbox');
                
                if (checkbox.prop('checked')) {
                    const viewDetailsBtn = $row.find('button.btn-info');
                    
                    try {
                        // Get the encoded data from onclick attribute
                        const onclickAttr = viewDetailsBtn.attr('onclick');
                        const encodedData = onclickAttr.split("'")[1];
                        const orderData = JSON.parse(decodeURIComponent(encodedData));
                        
                        // Add to selected rows array
                        selectedRows.push({
                            'Order ID': orderData['Order ID'] || '',
                            'Customer ID': orderData['Customer ID'] || '',
                            'Order Date': orderData['Order Date'] ? new Date(orderData['Order Date']).toLocaleString() : '',
                            'Total Price': orderData['Total Price'] ? `$${Number(orderData['Total Price']).toFixed(2)}` : '',
                            'Products Ordered': orderData['Products Ordered'] || ''
                        });
                    } catch (err) {
                        console.error('Error processing row:', err);
                    }
                }
            });

            if (selectedRows.length === 0) {
                alert('Please select at least one record to download');
                return;
            }

            // Headers for CSV
            const headers = [
                'Order ID',
                'Customer ID',
                'Order Date',
                'Total Price',
                'Products Ordered'
            ];

            // Create CSV data
            const csvData = {
                fields: headers,
                data: selectedRows.map(row => headers.map(header => row[header]))
            };

            // Convert to CSV
            const csv = Papa.unparse(csvData);
            
            // Download file
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Error downloading records:', error);
            alert('Error downloading records. Please try again.');
        }
    }

    // Make function globally accessible
    window.downloadSelectedRecords = downloadSelectedRecords;

    // Function to view order details
    function viewOrderDetails(encodedData) {
        try {
            const record = JSON.parse(decodeURIComponent(encodedData));
            console.log('Order Details:', record); // Debug log
            
            const modalContent = document.getElementById('orderDetailsContent');
            modalContent.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-bordered">
                        <tbody>
                            <tr>
                                <th style="width: 150px;">Order ID</th>
                                <td>${record['Order ID'] || ''}</td>
                            </tr>
                            <tr>
                                <th>Customer ID</th>
                                <td>${record['Customer ID'] || ''}</td>
                            </tr>
                            <tr>
                                <th>Order Date</th>
                                <td>${record['Order Date'] ? new Date(record['Order Date']).toLocaleString() : ''}</td>
                            </tr>
                            <tr>
                                <th>Total Price</th>
                                <td>$${Number(record['Total Price'] || 0).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <th>Products Ordered</th>
                                <td style="white-space: pre-wrap;">${record['Products Ordered'] || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
            
            const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
            modal.show();
        } catch (error) {
            console.error('Error displaying order details:', error);
            alert('Error displaying order details. Please try again.');
        }
    }

    // Make the function globally accessible
    window.viewOrderDetails = viewOrderDetails;

    // Function to open add product modal
    function openAddProductModal() {
        document.getElementById('productId').value = '';
        document.getElementById('productForm').reset();
        const modal = new bootstrap.Modal(document.getElementById('productModal'));
        modal.show();
    }

    // Function to open edit product modal
    async function openEditProductModal(productId) {
        try {
            const response = await fetch(
                `${window.AIRTABLE_URL}/${window.BASE_ID}/Products/${productId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${window.API_KEY}`
                    }
                }
            );
            
            if (!response.ok) throw new Error('Failed to fetch product');
            
            const data = await response.json();
            
            document.getElementById('productId').value = productId;
            document.getElementById('productName').value = data.fields.Name || '';
            document.getElementById('productPrice').value = data.fields.Price || '';
            document.getElementById('productImage').value = data.fields.ImageURL || '';
            
            const modal = new bootstrap.Modal(document.getElementById('productModal'));
            modal.show();
        } catch (error) {
            console.error('Error fetching product:', error);
            alert('Failed to load product details');
        }
    }

    // Function to save product (both add and edit)
    async function saveProduct() {
        try {
            const productId = document.getElementById('productId').value;
            const productData = {
                fields: {
                    Name: document.getElementById('productName').value,
                    Price: parseFloat(document.getElementById('productPrice').value),
                    ImageURL: document.getElementById('productImage').value
                }
            };

            const url = productId ? 
                `${window.AIRTABLE_URL}/${window.BASE_ID}/Products/${productId}` :
                `${window.AIRTABLE_URL}/${window.BASE_ID}/Products`;
            
            const method = productId ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${window.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productId ? productData : { records: [productData] })
            });

            if (!response.ok) throw new Error('Failed to save product');

            // Close modal and refresh data
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            modal.hide();
            loadSectionData('products');

        } catch (error) {
            console.error('Error saving product:', error);
            alert('Failed to save product');
        }
    }

    // Make functions globally accessible
    window.openAddProductModal = openAddProductModal;
    window.openEditProductModal = openEditProductModal;
    window.saveProduct = saveProduct;

    // Function to update order summary
    async function updateOrderSummary(orderData) {
        try {
            console.log('Starting order summary update with data:', orderData);

            // Get current month name and year
            const orderDate = new Date(orderData['Order Date']);
            const monthName = orderDate.toLocaleString('default', { month: 'long' });
            const year = orderDate.getFullYear();
            
            console.log('Processing for:', monthName, year);

            // Parse the Products Ordered field
            let productsOrdered;
            try {
                productsOrdered = JSON.parse(orderData['Products Ordered']);
                console.log('Parsed products:', productsOrdered);
            } catch (e) {
                console.error('Error parsing Products Ordered:', e);
                console.log('Raw Products Ordered data:', orderData['Products Ordered']);
                return;
            }

            // For each product in the order
            for (const product of productsOrdered) {
                console.log('Processing product:', product);

                // Find existing record in OrderHistory
                const records = await base('OrderHistory').select({
                    filterByFormula: `AND(
                        {Customer Code} = '${orderData['Customer ID']}',
                        {Item No.} = '${product.itemNo}'
                    )`
                }).firstPage();

                console.log('Found existing records:', records);

                const quantityField = `${monthName} (${year}) - Quantity`;
                const salesField = `${monthName} (${year}) - Sales Amount`;

                if (records.length > 0) {
                    // Update existing record
                    const record = records[0];
                    const currentQuantity = record.fields[quantityField] || 0;
                    const currentSales = record.fields[salesField] || 0;
                    const currentAnnualTotal = record.fields['Annual Total'] || 0;

                    console.log('Updating existing record:', {
                        recordId: record.id,
                        currentQuantity,
                        currentSales,
                        currentAnnualTotal,
                        newQuantity: currentQuantity + Number(product.quantity),
                        newSales: currentSales + (Number(product.quantity) * Number(product.price))
                    });

                    await base('OrderHistory').update([
                        {
                            id: record.id,
                            fields: {
                                [quantityField]: currentQuantity + Number(product.quantity),
                                [salesField]: currentSales + (Number(product.quantity) * Number(product.price)),
                                'Annual Total': currentAnnualTotal + Number(product.quantity)
                            }
                        }
                    ]);
                } else {
                    // Create new record
                    console.log('Creating new record with fields:', {
                        itemNo: product.itemNo,
                        description: product.name,
                        customerCode: orderData['Customer ID'],
                        customerName: orderData['Customer Name'],
                        quantity: Number(product.quantity),
                        sales: Number(product.quantity) * Number(product.price)
                    });

                    await base('OrderHistory').create([
                        {
                            fields: {
                                'Item No.': product.itemNo,
                                'Item Description': product.name,
                                'Customer Code': orderData['Customer ID'],
                                'Customer Name': orderData['Customer Name'],
                                [quantityField]: Number(product.quantity),
                                [salesField]: Number(product.quantity) * Number(product.price),
                                'Annual Total': Number(product.quantity)
                            }
                        }
                    ]);
                }
            }

            console.log('Order summary updated successfully');
        } catch (error) {
            console.error('Error updating order summary:', error);
            throw error;
        }
    }

    // Modify your existing order processing function to include this update
    async function processOrder(orderData) {
        try {
            // Your existing order processing code...

            // After successfully creating the order, update the summary
            await updateOrderSummary(orderData);

        } catch (error) {
            console.error('Error processing order:', error);
            throw error;
        }
    }

    // Function to handle new orders and update OrderHistory
    async function handleNewOrder(orderRecord) {
        try {
            console.log('Processing new order:', orderRecord);

            const orderData = orderRecord.fields;
            const orderDate = new Date(orderData['Order Date']);
            const monthName = orderDate.toLocaleString('default', { month: 'long' });
            const year = orderDate.getFullYear();
            
            // Parse Products Ordered string
            let productsOrdered;
            try {
                // Assuming Products Ordered is a string containing product details
                const productsString = orderData['Products Ordered'];
                // Split the string into lines and process each line
                const productLines = productsString.split('\n').filter(line => line.trim());
                
                productsOrdered = productLines.map(line => {
                    // Parse each line to extract product details
                    // Adjust this parsing based on your actual Products Ordered format
                    const match = line.match(/Item: (.*?), Quantity: (\d+), Price: \$?([\d.]+)/);
                    if (match) {
                        return {
                            itemNo: match[1].trim(),
                            quantity: parseInt(match[2]),
                            price: parseFloat(match[3])
                        };
                    }
                    return null;
                }).filter(p => p !== null);

                console.log('Parsed products:', productsOrdered);
            } catch (e) {
                console.error('Error parsing Products Ordered:', e);
                console.log('Raw Products Ordered data:', orderData['Products Ordered']);
                return;
            }

            // Process each product in the order
            for (const product of productsOrdered) {
                console.log('Processing product:', product);

                // Find existing record in OrderHistory
                const records = await base('OrderHistory').select({
                    filterByFormula: `AND(
                        {Customer Code} = '${orderData['Customer ID']}',
                        {Item No.} = '${product.itemNo}'
                    )`
                }).firstPage();

                const quantityField = `${monthName} (${year}) - Quantity`;
                const salesField = `${monthName} (${year}) - Sales Amount`;

                if (records.length > 0) {
                    // Update existing record
                    const record = records[0];
                    const currentQuantity = record.fields[quantityField] || 0;
                    const currentSales = record.fields[salesField] || 0;
                    const currentAnnualTotal = record.fields['Annual Total'] || 0;

                    console.log('Updating existing record:', {
                        recordId: record.id,
                        currentQuantity,
                        newQuantity: currentQuantity + product.quantity
                    });

                    await base('OrderHistory').update([{
                        id: record.id,
                        fields: {
                            [quantityField]: currentQuantity + product.quantity,
                            [salesField]: currentSales + (product.quantity * product.price),
                            'Annual Total': currentAnnualTotal + product.quantity
                        }
                    }]);
                } else {
                    // Get customer name from another table if needed
                    // Create new record
                    console.log('Creating new record for:', product.itemNo);

                    await base('OrderHistory').create([{
                        fields: {
                            'Item No.': product.itemNo,
                            'Customer Code': orderData['Customer ID'],
                            [quantityField]: product.quantity,
                            [salesField]: product.quantity * product.price,
                            'Annual Total': product.quantity
                        }
                    }]);
                }
            }

            console.log('Order history updated successfully');
        } catch (error) {
            console.error('Error updating order history:', error);
        }
    }

    // Add this to your loadSectionData function
    async function loadSectionData(sectionName) {
        try {
            const section = sections[sectionName];
            if (!section) return;

            const records = await base(section.tableName).select().all();
            
            // If this is the Orders section, process any new orders
            if (sectionName === 'orders') {
                // Get the last processed order timestamp from localStorage
                const lastProcessedTime = localStorage.getItem('lastProcessedOrderTime') || '1970-01-01T00:00:00.000Z';
                
                // Find new orders
                const newOrders = records.filter(record => {
                    const orderTimestamp = record.fields['Timestamp'];
                    return orderTimestamp && orderTimestamp > lastProcessedTime;
                });

                // Process new orders
                for (const order of newOrders) {
                    await handleNewOrder(order);
                }

                // Update the last processed timestamp
                if (newOrders.length > 0) {
                    const latestTimestamp = newOrders
                        .map(order => order.fields['Timestamp'])
                        .sort()
                        .pop();
                    localStorage.setItem('lastProcessedOrderTime', latestTimestamp);
                }
            }

            displaySectionData(sectionName, records);
        } catch (error) {
            console.error('Error loading section data:', error);
        }
    }

    // Wait for Airtable to be loaded
    window.addEventListener('load', function() {
        // Initialize Airtable
        const myAirtableBase = new Airtable({
            apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'
        }).base('appipp8LFUGElp3Di');

        // Section configuration
        const sections = {
            'products': {
                tableName: 'Products',
                displayName: 'Products Management',
                fields: ['Name', 'Price', 'ImageURL', 'CustomerID']
            },
            'orders': {
                tableName: 'Orders', // Make sure this matches your Airtable table name exactly
                displayName: 'Orders History',
                fields: ['OrderID', 'CustomerID', 'ProductsOrdered', 'TotalPrice', 'OrderDate', 'Timestamp']
            }
        };

        // Function to load section data
        window.loadSectionData = function(sectionName) {
            console.log('Loading section:', sectionName);
            try {
                const section = sections[sectionName];
                if (!section) return;

                myAirtableBase(section.tableName).select({
                    maxRecords: 100,
                    view: "Grid view"
                }).eachPage(function page(records, fetchNextPage) {
                    console.log('Records fetched:', records.length);
                    if (sectionName === 'products') {
                        displayProducts(records);
                    }
                    fetchNextPage();
                }, function done(err) {
                    if (err) {
                        console.error('Error fetching records:', err);
                    }
                });
            } catch (error) {
                console.error('Error in loadSectionData:', error);
            }
        };

        // Function to display products
        function displayProducts(records) {
            console.log('Displaying products:', records);
            
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) {
                console.error('Main content element not found');
                return;
            }
            
            const html = `
                <div class="container-fluid p-4">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3>Products List</h3>
                        <button class="btn btn-primary" onclick="addNewProduct()">
                            <i class="fas fa-plus"></i> Add New Product
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped" id="productsTable">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Price</th>
                                    <th>Image</th>
                                    <th>Customer ID</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${records.map(record => `
                                    <tr>
                                        <td>${record.fields.Name || ''}</td>
                                        <td>${record.fields.Price ? `$${Number(record.fields.Price).toFixed(2)}` : ''}</td>
                                        <td>${record.fields.ImageURL ? 
                                            `<img src="${record.fields.ImageURL}" alt="Product" style="height: 50px;">` : 
                                            'No Image'}</td>
                                        <td>${record.fields.CustomerID || ''}</td>
                                        <td>
                                            <div class="btn-group">
                                                <button class="btn btn-sm btn-info" onclick="viewProduct('${record.id}')">
                                                    <i class="fas fa-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-primary" onclick="editProduct('${record.id}')">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${record.id}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

            mainContent.innerHTML = html;

            try {
                if ($.fn.DataTable.isDataTable('#productsTable')) {
                    $('#productsTable').DataTable().destroy();
                }
                
                $('#productsTable').DataTable({
                    pageLength: 10,
                    responsive: true,
                    order: [[0, 'asc']]
                });
            } catch (error) {
                console.error('Error initializing DataTable:', error);
            }
        }

        // Helper functions for actions
        window.viewProduct = function(id) {
            console.log('Viewing product:', id);
        };

        window.editProduct = function(id) {
            console.log('Editing product:', id);
        };

        window.deleteProduct = function(id) {
            console.log('Deleting product:', id);
        };

        console.log('Admin panel initialized');
    });

    // Add helper functions for actions
    function viewImage(url, name) {
        const modal = `
            <div class="modal fade" id="imageModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img src="${url}" alt="${name}" class="img-fluid">
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modal);
        const modalElement = document.getElementById('imageModal');
        const bootstrapModal = new bootstrap.Modal(modalElement);
        bootstrapModal.show();
        modalElement.addEventListener('hidden.bs.modal', function() {
            modalElement.remove();
        });
    }

    // Function to handle adding new product
    function addNewProduct() {
        const modal = `
            <div class="modal fade" id="addProductModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add New Product</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addProductForm">
                                <div class="mb-3">
                                    <label for="productName" class="form-label">Name</label>
                                    <input type="text" class="form-control" id="productName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="productPrice" class="form-label">Price ($)</label>
                                    <input type="number" class="form-control" id="productPrice" step="0.01" min="0" required>
                                </div>
                                <div class="mb-3">
                                    <label for="productImage" class="form-label">Image URL</label>
                                    <input type="url" class="form-control" id="productImage" 
                                        placeholder="https://example.com/image.jpg">
                                    <div class="form-text">Enter a valid image URL (e.g., https://example.com/image.jpg)</div>
                                    <div id="imagePreview" class="mt-2 d-none">
                                        <img src="" alt="Preview" style="max-height: 100px; max-width: 100%;">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="productCustomerId" class="form-label">Customer ID</label>
                                    <input type="text" class="form-control" id="productCustomerId">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveNewProduct()">Save Product</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existingModal = document.getElementById('addProductModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modal);
        
        // Show modal
        const modalElement = document.getElementById('addProductModal');
        const bootstrapModal = new bootstrap.Modal(modalElement);
        bootstrapModal.show();
        
        // Add image preview functionality
        const imageInput = document.getElementById('productImage');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = imagePreview.querySelector('img');
        
        imageInput.addEventListener('input', function() {
            const imageUrl = this.value.trim();
            if (imageUrl) {
                previewImg.src = imageUrl;
                previewImg.onload = function() {
                    imagePreview.classList.remove('d-none');
                };
                previewImg.onerror = function() {
                    imagePreview.classList.add('d-none');
                    alert('Invalid image URL. Please enter a valid image URL.');
                };
            } else {
                imagePreview.classList.add('d-none');
            }
        });
        
        // Clean up modal when closed
        modalElement.addEventListener('hidden.bs.modal', function() {
            modalElement.remove();
        });
    }

    // Function to save new product
    function saveNewProduct() {
        // Get form values
        const name = document.getElementById('productName').value.trim();
        const basePrice = document.getElementById('productPrice').value.trim();
        const imageUrl = document.getElementById('productImage').value.trim();
        const customerId = document.getElementById('productCustomerId').value.trim();
        const specialPrice = document.getElementById('productSpecialPrice').value.trim();

        // Validate required fields
        if (!name || !basePrice) {
            alert('Name and Base Price are required!');
            return;
        }

        // Validate special price if customer ID is provided
        if (customerId && !specialPrice) {
            alert('Please enter a special price when specifying a customer ID');
            return;
        }

        // Validate customer ID format
        const customerIdInput = document.getElementById('productCustomerId');
        if (customerId && customerIdInput.classList.contains('is-invalid')) {
            alert('Please enter a valid Customer ID');
            return;
        }

        // Create new Airtable instance
        const base = new Airtable({apiKey: window.API_KEY}).base(window.BASE_ID);

        // Prepare the record
        const record = {
            Name: name,
            Price: parseFloat(basePrice)
        };

        // Add ImageURL if provided
        if (imageUrl) {
            record.ImageURL = imageUrl;
        }

        // Add CustomerID and SpecialPrice if provided
        if (customerId && specialPrice) {
            record.CustomerID = customerId;
            record.SpecialPrice = parseFloat(specialPrice);
        }

        // Create record in Airtable
        base('Products').create([
            {
                fields: record
            }
        ], function(err, records) {
            if (err) {
                console.error('Error creating product:', err);
                alert('Error saving product');
                return;
            }
            
            console.log('Product created successfully:', records);
            
            // Close modal
            const modalElement = document.getElementById('addProductModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            
            // Refresh products list
            loadProducts();
            
            // Show success message
            alert('Product added successfully!');
        });
    }

    // Make functions globally available
    window.addNewProduct = addNewProduct;
    window.saveNewProduct = saveNewProduct;

    // Function to save edited product
    function saveEditedProduct() {
        const id = document.getElementById('editProductId').value;
        const name = document.getElementById('editProductName').value;
        const price = document.getElementById('editProductPrice').value;
        const imageUrl = document.getElementById('editProductImage').value;
        const customerId = document.getElementById('editProductCustomerId').value;

        if (!name || !price) {
            alert('Name and Price are required!');
            return;
        }

        console.log('Saving edited product:', id);

        myAirtableBase('Products').update([
            {
                id: id,
                fields: {
                    Name: name,
                    Price: parseFloat(price),
                    ImageURL: imageUrl || null,
                    CustomerID: customerId || null
                }
            }
        ], function(err, records) {
            if (err) {
                console.error('Error updating product:', err);
                alert('Error updating product');
                return;
            }
            
            console.log('Product updated:', records);
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
            modal.hide();
            
            // Refresh products list
            loadSectionData('products');
            
            // Show success message
            alert('Product updated successfully!');
        });
    }

    // Function to handle adding new product
    function addNewProduct() {
        const modal = `
            <div class="modal fade" id="addProductModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Add New Product</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="addProductForm">
                                <div class="mb-3">
                                    <label for="productName" class="form-label">Name</label>
                                    <input type="text" class="form-control" id="productName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="productPrice" class="form-label">Base Price ($)</label>
                                    <input type="number" class="form-control" id="productPrice" step="0.01" min="0" required>
                                </div>
                                <div class="mb-3">
                                    <label for="productImage" class="form-label">Image URL</label>
                                    <input type="url" class="form-control" id="productImage" 
                                        placeholder="https://example.com/image.jpg">
                                    <div class="form-text">Enter a valid image URL (e.g., https://example.com/image.jpg)</div>
                                    <div id="imagePreview" class="mt-2 d-none">
                                        <img src="" alt="Preview" style="max-height: 100px; max-width: 100%;">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label for="productCustomerId" class="form-label">Customer ID</label>
                                    <input type="text" class="form-control" id="productCustomerId" 
                                        placeholder="Enter customer ID for special pricing">
                                    <div class="form-text">Leave empty to make product available to all customers</div>
                                </div>
                                <div class="mb-3">
                                    <label for="productSpecialPrice" class="form-label">Special Price ($)</label>
                                    <input type="number" class="form-control" id="productSpecialPrice" 
                                        step="0.01" min="0" disabled>
                                    <div class="form-text">Special price for the specific customer</div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="saveNewProduct()">Save Product</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove any existing modal
        const existingModal = document.getElementById('addProductModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to document
        document.body.insertAdjacentHTML('beforeend', modal);
        
        // Show modal
        const modalElement = document.getElementById('addProductModal');
        const bootstrapModal = new bootstrap.Modal(modalElement);
        bootstrapModal.show();
        
        // Add image preview functionality
        const imageInput = document.getElementById('productImage');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = imagePreview.querySelector('img');
        
        imageInput.addEventListener('input', function() {
            const imageUrl = this.value.trim();
            if (imageUrl) {
                previewImg.src = imageUrl;
                previewImg.onload = function() {
                    imagePreview.classList.remove('d-none');
                };
                previewImg.onerror = function() {
                    imagePreview.classList.add('d-none');
                    alert('Invalid image URL. Please enter a valid image URL.');
                };
            } else {
                imagePreview.classList.add('d-none');
            }
        });

        // Add customer ID validation and special price handling
        const customerIdInput = document.getElementById('productCustomerId');
        const specialPriceInput = document.getElementById('productSpecialPrice');

        customerIdInput.addEventListener('input', async function() {
            const customerId = this.value.trim();
            
            if (customerId) {
                // Enable special price input when customer ID is entered
                specialPriceInput.disabled = false;
                
                try {
                    // Verify if customer exists
                    const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Users?filterByFormula={CustomerID}='${customerId}'`, {
                        headers: {
                            'Authorization': `Bearer ${window.API_KEY}`
                        }
                    });

                    if (!response.ok) throw new Error('Failed to verify customer');
                    
                    const data = await response.json();
                    
                    if (data.records.length === 0) {
                        // Customer not found
                        this.classList.add('is-invalid');
                        if (!this.nextElementSibling?.classList.contains('invalid-feedback')) {
                            const feedback = document.createElement('div');
                            feedback.className = 'invalid-feedback';
                            feedback.textContent = 'Customer ID not found';
                            this.parentNode.appendChild(feedback);
                        }
                    } else {
                        // Customer found
                        this.classList.remove('is-invalid');
                        this.classList.add('is-valid');
                        if (!this.nextElementSibling?.classList.contains('valid-feedback')) {
                            const feedback = document.createElement('div');
                            feedback.className = 'valid-feedback';
                            feedback.textContent = 'Customer verified';
                            this.parentNode.appendChild(feedback);
                        }
                    }
                } catch (error) {
                    console.error('Error verifying customer:', error);
                    this.classList.add('is-invalid');
                    if (!this.nextElementSibling?.classList.contains('invalid-feedback')) {
                        const feedback = document.createElement('div');
                        feedback.className = 'invalid-feedback';
                        feedback.textContent = 'Error verifying customer';
                        this.parentNode.appendChild(feedback);
                    }
                }
            } else {
                // Reset validation state and disable special price when customer ID is empty
                this.classList.remove('is-invalid', 'is-valid');
                specialPriceInput.disabled = true;
                specialPriceInput.value = '';
            }
        });
    }

    // Add this function to display orders
    function displayOrders(records) {
        console.log('Displaying orders:', records);
        
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.error('Main content element not found');
            return;
        }

        // Pagination variables
        const itemsPerPage = 10;
        let currentPage = 1;
        let filteredRecords = [...records];

        // Add selection tracking
        let selectedOrders = new Set();

        // Function to handle selection changes
        function updateSelectionCount() {
            const count = selectedOrders.size;
            const downloadSelected = document.getElementById('downloadSelected');
            if (downloadSelected) {
                downloadSelected.textContent = `Download Selected (${count})`;
                downloadSelected.disabled = count === 0;
            }
        }

        // Date filtering function
        function filterByDate(period) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            
            filteredRecords = records.filter(record => {
                const orderDate = new Date(record.fields['Order Date']);
                
                switch(period) {
                    case 'today':
                        return orderDate >= today;
                    case 'month':
                        return orderDate >= firstDayOfMonth;
                    case 'all':
                        return true;
                    default:
                        return true;
                }
            });

            currentPage = 1;
            const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
            displayRecordsForPage(currentPage);
            updatePaginationButtons(currentPage, totalPages);
        }

        // Function to display records for current page
        function displayRecordsForPage(page) {
            const start = (page - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageRecords = filteredRecords.slice(start, end);

            const tableBody = document.querySelector('#ordersTable tbody');
            tableBody.innerHTML = pageRecords.map(record => {
                const productsOrdered = record.fields['Products Ordered'] || '';
                const productPreview = productsOrdered.split('\n')[0] + 
                    (productsOrdered.includes('\n') ? '...' : '');
                const isSelected = selectedOrders.has(record.id);

                return `
                    <tr>
                        <td>
                            <div class="form-check">
                                <input class="form-check-input order-select" type="checkbox" 
                                       value="${record.id}" ${isSelected ? 'checked' : ''}>
                            </div>
                        </td>
                        <td>${record.fields['Order ID'] || ''}</td>
                        <td>${record.fields['Customer ID'] || ''}</td>
                        <td>
                            <div class="text-truncate" style="max-width: 200px;" 
                                 title="${productsOrdered.replace(/"/g, '&quot;')}">
                                ${productPreview}
                            </div>
                        </td>
                        <td>$${record.fields['Total Price'] ? Number(record.fields['Total Price']).toFixed(2) : '0.00'}</td>
                        <td>${record.fields['Order Date'] ? new Date(record.fields['Order Date']).toLocaleString() : ''}</td>
                        <td>
                            <button class="btn btn-sm btn-info" onclick="viewOrder('${record.id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Update pagination info
            document.getElementById('paginationInfo').textContent = 
                `Showing ${start + 1} to ${Math.min(end, filteredRecords.length)} of ${filteredRecords.length} entries`;

            // Add event listeners for checkboxes
            document.querySelectorAll('.order-select').forEach(checkbox => {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        selectedOrders.add(this.value);
                    } else {
                        selectedOrders.delete(this.value);
                    }
                    updateSelectionCount();
                });
            });

            // Update "Select All" checkbox state
            const selectAllCheckbox = document.getElementById('selectAll');
            if (selectAllCheckbox) {
                const pageCheckboxes = document.querySelectorAll('.order-select');
                selectAllCheckbox.checked = pageCheckboxes.length > 0 && 
                    Array.from(pageCheckboxes).every(cb => cb.checked);
            }
        }

        // Function to update pagination buttons
        function updatePaginationButtons(currentPage, totalPages) {
            const paginationContainer = document.getElementById('pagination');
            let buttons = '';

            // Previous button
            buttons += `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>`;

            // Page numbers
            for (let i = 1; i <= totalPages; i++) {
                buttons += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
            }

            // Next button
            buttons += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>`;

            paginationContainer.innerHTML = buttons;
        }

        // Initial HTML setup
        const html = `
            <div class="container-fluid p-4">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>Orders History</h3>
                    <div class="btn-group" role="group">
                        <button type="button" class="btn btn-outline-primary active" onclick="filterOrders('today')">Today</button>
                        <button type="button" class="btn btn-outline-primary" onclick="filterOrders('month')">This Month</button>
                        <button type="button" class="btn btn-outline-primary" onclick="filterOrders('all')">All</button>
                    </div>
                </div>
                <div class="row mb-4">
                    <div class="col-md-6">
                        <div class="input-group">
                            <span class="input-group-text">
                                <i class="fas fa-search"></i>
                            </span>
                            <input type="text" id="orderSearch" class="form-control" 
                                   placeholder="Search orders by ID, Customer ID, Products, or Price...">
                        </div>
                    </div>
                    <div class="col-md-6 text-end">
                        <div class="btn-group">
                            <button class="btn btn-success" id="downloadSelected" onclick="downloadOrders('selected')" disabled>
                                <i class="fas fa-download"></i> Download Selected (0)
                            </button>
                            <button class="btn btn-primary" onclick="downloadOrders('all')">
                                <i class="fas fa-download"></i> Download All
                            </button>
                        </div>
                    </div>
                </div>
                <div class="table-responsive">
                    <table id="ordersTable" class="table table-striped">
                        <thead>
                            <tr>
                                <th>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="selectAll">
                                    </div>
                                </th>
                                <th>Order ID</th>
                                <th>Customer ID</th>
                                <th>Products Ordered</th>
                                <th>Total Price</th>
                                <th>Order Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                    <div id="paginationInfo" class="mt-3"></div>
                    <div id="pagination" class="pagination"></div>
                </div>
            </div>
        `;

        mainContent.innerHTML = html;

        // Make functions available globally
        window.changePage = function(page) {
            const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                displayRecordsForPage(currentPage);
                updatePaginationButtons(currentPage, totalPages);
            }
        };

        window.filterOrders = function(period) {
            // Update button states
            const buttons = document.querySelectorAll('.btn-group .btn');
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            filterByDate(period);
        };

        // Initial display (show all records by default)
        filterByDate('all');
    }

    // Helper function to get status color
    function getStatusColor(status) {
        switch (status?.toLowerCase()) {
            case 'completed':
                return 'success';
            case 'processing':
                return 'primary';
            case 'cancelled':
                return 'danger';
            case 'shipped':
                return 'info';
            default:
                return 'warning'; // For 'pending' or undefined
        }
    }

    // Function to view order details
    function viewOrder(id) {
        console.log('Viewing order:', id);
        const base = new Airtable({apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'}).base('appipp8LFUGElp3Di');
    
        base('Orders').find(id, function(err, record) {
            if (err) {
                console.error('Error fetching order:', err);
                alert('Error fetching order details');
                return;
            }
            
            console.log('Order details:', record.fields);
            
            const modal = `
                <div class="modal fade" id="viewOrderModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Order Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <strong>Order ID:</strong><br>
                                        ${record.fields['Order ID'] || ''}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Customer ID:</strong><br>
                                        ${record.fields['Customer ID'] || ''}
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <strong>Products Ordered:</strong><br>
                                    <div class="border rounded p-3 bg-light">
                                        ${record.fields['Products Ordered'] ? record.fields['Products Ordered'].replace(/\n/g, '<br>') : ''}
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <strong>Total Price:</strong><br>
                                        $${record.fields['Total Price'] ? Number(record.fields['Total Price']).toFixed(2) : '0.00'}
                                    </div>
                                    <div class="col-md-6">
                                        <strong>Order Date:</strong><br>
                                        ${record.fields['Order Date'] ? new Date(record.fields['Order Date']).toLocaleString() : ''}
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <strong>Timestamp:</strong><br>
                                    ${record.fields['Timestamp'] ? new Date(record.fields['Timestamp']).toLocaleString() : ''}
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove any existing modal
            const existingModal = document.getElementById('viewOrderModal');
            if (existingModal) {
                existingModal.remove();
            }

            document.body.insertAdjacentHTML('beforeend', modal);
            const modalElement = document.getElementById('viewOrderModal');
            const bootstrapModal = new bootstrap.Modal(modalElement);
            bootstrapModal.show();
            
            modalElement.addEventListener('hidden.bs.modal', function() {
                modalElement.remove();
            });
        });
    }

    // Function to update order status
    function updateOrderStatus(id) {
        const base = new Airtable({apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'}).base('appipp8LFUGElp3Di');
    
        base('Orders').find(id, function(err, record) {
            if (err) {
                console.error('Error fetching order:', err);
                alert('Error fetching order details');
                return;
            }
            
            const modal = `
                <div class="modal fade" id="updateStatusModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Update Order Status</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="updateStatusForm">
                                    <div class="mb-3">
                                        <label for="orderStatus" class="form-label">Status</label>
                                        <select class="form-select" id="orderStatus">
                                            <option value="Pending" ${record.fields.Status === 'Pending' ? 'selected' : ''}>Pending</option>
                                            <option value="Processing" ${record.fields.Status === 'Processing' ? 'selected' : ''}>Processing</option>
                                            <option value="Shipped" ${record.fields.Status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                                            <option value="Completed" ${record.fields.Status === 'Completed' ? 'selected' : ''}>Completed</option>
                                            <option value="Cancelled" ${record.fields.Status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                                        </select>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="saveOrderStatus('${id}')">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove any existing modal
            const existingModal = document.getElementById('updateStatusModal');
            if (existingModal) {
                existingModal.remove();
            }

            document.body.insertAdjacentHTML('beforeend', modal);
            const modalElement = document.getElementById('updateStatusModal');
            const bootstrapModal = new bootstrap.Modal(modalElement);
            bootstrapModal.show();
            
            modalElement.addEventListener('hidden.bs.modal', function() {
                modalElement.remove();
            });
        });
    }

    // Function to save order status
    function saveOrderStatus(id) {
        const status = document.getElementById('orderStatus').value;
        const base = new Airtable({apiKey: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542'}).base('appipp8LFUGElp3Di');

        base('Orders').update([
            {
                id: id,
                fields: {
                    Status: status
                }
            }
        ], function(err, records) {
            if (err) {
                console.error('Error updating order status:', err);
                alert('Error updating order status');
                return;
            }
            
            // Close modal
            const modalElement = document.getElementById('updateStatusModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            
            // Refresh orders list
            loadSectionData('orders');
            
            // Show success message
            alert('Order status updated successfully!');
        });
    }

    // Make functions globally available
    window.viewOrder = viewOrder;
    window.updateOrderStatus = updateOrderStatus;
    window.saveOrderStatus = saveOrderStatus;

    // Add this utility function at the top of your file
    function convertToCSV(records) {
        // Define headers
        const headers = ['Order ID', 'Customer ID', 'Products Ordered', 'Total Price', 'Order Date'];
        
        // Convert records to CSV format
        const rows = records.map(record => [
            record.fields['Order ID'] || '',
            record.fields['Customer ID'] || '',
            `"${(record.fields['Products Ordered'] || '').replace(/"/g, '""')}"`, // Handle quotes in products
            record.fields['Total Price'] ? Number(record.fields['Total Price']).toFixed(2) : '0.00',
            record.fields['Order Date'] ? new Date(record.fields['Order Date']).toLocaleString() : ''
        ]);
        
        // Combine headers and rows
        return [headers, ...rows]
            .map(row => row.join(','))
            .join('\n');
    }

    function downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        // Create download link
        if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Update the HTML part of your displayOrders function to include download buttons
    const html = `
        <div class="container-fluid p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3>Orders History</h3>
                <div class="btn-group" role="group">
                    <button type="button" class="btn btn-outline-primary active" onclick="filterOrders('today')">Today</button>
                    <button type="button" class="btn btn-outline-primary" onclick="filterOrders('month')">This Month</button>
                    <button type="button" class="btn btn-outline-primary" onclick="filterOrders('all')">All</button>
                </div>
            </div>
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="fas fa-search"></i>
                        </span>
                        <input type="text" id="orderSearch" class="form-control" 
                               placeholder="Search orders by ID, Customer ID, Products, or Price...">
                    </div>
                </div>
                <div class="col-md-6 text-end">
                    <div class="btn-group">
                        <button class="btn btn-success" id="downloadSelected" onclick="downloadOrders('selected')" disabled>
                            <i class="fas fa-download"></i> Download Selected (0)
                        </button>
                        <button class="btn btn-primary" onclick="downloadOrders('all')">
                            <i class="fas fa-download"></i> Download All
                        </button>
                    </div>
                </div>
            </div>
            <div class="table-responsive">
                <!-- ... rest of your table HTML ... -->
            </div>
        </div>
    `;

    // Add the download function to your global scope
    window.downloadOrders = function(type) {
        const timestamp = new Date().toISOString().slice(0, 10);
        let recordsToDownload;
        
        switch(type) {
            case 'selected':
                recordsToDownload = records.filter(record => selectedOrders.has(record.id));
                break;
            case 'all':
                recordsToDownload = records;
                break;
            default:
                recordsToDownload = filteredRecords;
        }
        
        // Sort records by Order Date before download
        recordsToDownload.sort((a, b) => {
            const dateA = new Date(a.fields['Order Date'] || 0);
            const dateB = new Date(b.fields['Order Date'] || 0);
            return dateB - dateA; // Most recent first
        });
        
        const filename = `orders_export_${timestamp}.csv`;
        const csv = convertToCSV(recordsToDownload);
        downloadCSV(csv, filename);
    };

    // Add this function to handle user creation
    function loadUsers() {
        // Clear the content area
        const content = document.getElementById('content');
        
        // Create the users section HTML
        content.innerHTML = `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2>User Accounts</h2>
                    <button type="button" class="btn btn-primary" onclick="showCreateUserModal()">
                        <i class='bx bx-plus'></i> Create New User
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="table table-striped" id="usersTable">
                        <thead>
                            <tr>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Company</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody"></tbody>
                    </table>
                </div>
            </div>
        `;

        // Fetch and display users
        fetch(`${AIRTABLE_URL}/${BASE_ID}/Users?view=Grid%20view`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        })
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = data.records.map(user => `
                <tr>
                    <td>${user.fields.Email || ''}</td>
                    <td>${user.fields.Role || ''}</td>
                    <td>${user.fields.Company || ''}</td>
                    <td>
                        <button class="btn btn-sm btn-warning me-2" onclick="editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('usersTableBody').innerHTML = `
                <tr><td colspan="4" class="text-center text-danger">Error loading users</td></tr>
            `;
        });
    }

    // Make sure this function is called when clicking on User Accounts
    document.addEventListener('DOMContentLoaded', function() {
        const userAccountsLink = document.querySelector('a[data-section="users"]');
        if (userAccountsLink) {
            userAccountsLink.addEventListener('click', function(e) {
                e.preventDefault();
                loadUsers();
            });
        }
    });

    // Add this function to handle user creation
    async function createNewUser() {
        try {
            const email = document.getElementById('newUserEmail').value;
            const password = document.getElementById('newUserPassword').value;
            const role = document.getElementById('newUserRole').value;
            const company = document.getElementById('newUserCompany').value;

            if (!email || !password || !role || !company) {
                alert('Please fill in all fields');
                return;
            }

            const response = await fetch(`${AIRTABLE_URL}/${BASE_ID}/Users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    records: [{
                        fields: {
                            Email: email,
                            Password: password,
                            Role: role,
                            Company: company
                        }
                    }]
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create user');
            }

            alert('User created successfully!');
            
            // Close the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('createUserModal'));
            modal.hide();
            
            // Refresh the user list
            loadUsers();
            
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to create user: ' + error.message);
        }
    }

    // Add this to your existing admin.js
    function showCreateUserModal() {
        // Check if modal exists, if not create it
        if (!document.getElementById('createUserModal')) {
            const modalHtml = `
                <div class="modal fade" id="createUserModal" tabindex="-1">
                    <div class="modal-dialog">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Create New User</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <form id="createUserForm">
                                    <div class="mb-3">
                                        <label class="form-label">Email</label>
                                        <input type="email" class="form-control" id="newUserEmail" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Password</label>
                                        <input type="password" class="form-control" id="newUserPassword" required>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Role</label>
                                        <select class="form-control" id="newUserRole" required>
                                            <option value="customer">Customer</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Company</label>
                                        <input type="text" class="form-control" id="newUserCompany" required>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-primary" onclick="createNewUser()">Create User</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
        modal.show();
    }

