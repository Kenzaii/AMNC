// Check authorization
document.addEventListener('DOMContentLoaded', function() {
    // Allow both user and guest roles
    if (!checkAuth(['user', 'guest'])) return;
    
    // Display current user
    const user = getCurrentUser();
    document.getElementById('current-user').textContent = user.name || user.username;
    
    // Load orders and products
    loadOrders();
    
    // Setup event listeners
    setupEventListeners();
});

// Global variables
let orders = [];
let products = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentFilters = {
    dateFrom: '',
    dateTo: ''
};
let isGuest = false;

// Load user orders and products
function loadOrders() {
    isGuest = localStorage.getItem('userRole') === 'Guest';
    const user = getCurrentUser();
    
    console.log("Loading orders for user:", user);
    
    // First load products for reference
    fetch(`${API_URL}/Products`, {
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            console.error("Products API error:", response.status, response.statusText);
            throw new Error(`API error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Products loaded successfully:", data.records ? data.records.length : 0);
        products = data.records.map(record => ({
            id: record.id,
            ...record.fields
        }));
        
        // Then load orders
        let filter = '';
        
        if (isGuest) {
            // For guests, use their name as Customer ID
            filter = encodeURIComponent(`{Customer ID}="${user.name}"`);
            console.log("Using guest filter:", filter);
        } else {
            // For registered users, we use their BPCode which is stored in Customer ID field
            // Note: This is the important field to match with orders in Airtable
            const userBPCode = user.bpCode || user.id || user.username || user.name;
            if (!userBPCode) {
                console.warn("Registered user has no BP code. Cannot fetch orders.");
                displayNoOrdersMessage("No order history found for this account.");
                return Promise.reject("No user identifiers available");
            }
            
            filter = encodeURIComponent(`{Customer ID}="${userBPCode}"`);
            console.log("Using BP code filter:", filter, "for user:", userBPCode);
        }
        
        console.log("Fetching orders with filter:", decodeURIComponent(filter));
        
        // Start with empty array for all orders
        orders = [];
        
        // Function to fetch a batch of orders with pagination
        function fetchOrderBatch(offset = null) {
            let url = `${API_URL}/Orders?filterByFormula=${filter}&pageSize=100`;
            if (offset) {
                url += `&offset=${offset}`;
            }
            
            console.log("Fetching orders batch with URL:", url);
            
            return fetch(url, {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    console.error("Orders API error:", response.status, response.statusText);
                    return response.text().then(text => {
                        console.error("Error response:", text);
                        throw new Error(`API error: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                // Add this batch of records to our orders array
                const batchOrders = data.records.map(record => ({
                    id: record.id,
                    ...record.fields
                }));
                
                console.log(`Fetched batch of ${batchOrders.length} orders`);
                orders = [...orders, ...batchOrders];
                
                // If there's an offset, fetch the next batch
                if (data.offset) {
                    console.log("More orders available, fetching next batch with offset:", data.offset);
                    return fetchOrderBatch(data.offset);
                } else {
                    console.log(`All orders fetched, total: ${orders.length}`);
                    return orders;
                }
            });
        }
        
        // Start the first batch fetch
        return fetchOrderBatch();
    })
    .then(() => {
        console.log("Total orders retrieved:", orders.length);
        
        // Sort by date (most recent first)
        orders.sort((a, b) => {
            const dateA = new Date(b["Order Date"] || b.Timestamp || '0');
            const dateB = new Date(a["Order Date"] || a.Timestamp || '0');
            return dateA - dateB;
        });
        
        if (orders.length === 0) {
            displayNoOrdersMessage("No orders found.");
        } else {
            applyFiltersAndDisplay();
        }
    })
    .catch(error => {
        console.error('Error loading data:', error);
        if (error !== "No user identifiers available") {
            showNotification('Failed to load orders. Please check your internet connection and try again.', 'error');
            displayNoOrdersMessage("Error loading orders. Please try again later.");
        }
    });
}

// Helper function to display a message when no orders are found
function displayNoOrdersMessage(message) {
    const tableContainer = document.querySelector('.table-responsive');
    tableContainer.innerHTML = `
        <div class="no-orders-message">
            <p>${message}</p>
            <a href="index.html" class="btn btn-primary">Browse Products</a>
        </div>
    `;
    
    // Hide pagination
    document.getElementById('pagination').innerHTML = '';
}

// Setup event listeners
function setupEventListeners() {
    // Date filters
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    const filterBtn = document.getElementById('filter-btn');
    
    dateFromInput.addEventListener('change', function() {
        currentFilters.dateFrom = this.value;
    });
    
    dateToInput.addEventListener('change', function() {
        currentFilters.dateTo = this.value;
    });
    
    filterBtn.addEventListener('click', function() {
        currentPage = 1;
        applyFiltersAndDisplay();
    });
    
    // Close modal
    const closeModal = document.querySelector('#order-modal .close');
    closeModal.addEventListener('click', closeOrderModal);
}

// Filter and display orders
function applyFiltersAndDisplay() {
    let filteredOrders = orders;
    
    // Apply date filters
    if (currentFilters.dateFrom) {
        const fromDate = new Date(currentFilters.dateFrom);
        filteredOrders = filteredOrders.filter(order => new Date(order["Order Date"] || order.Timestamp) >= fromDate);
    }
    
    if (currentFilters.dateTo) {
        const toDate = new Date(currentFilters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        filteredOrders = filteredOrders.filter(order => new Date(order["Order Date"] || order.Timestamp) <= toDate);
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const ordersToDisplay = filteredOrders.slice(startIndex, endIndex);
    
    // Display orders
    displayOrders(ordersToDisplay);
    
    // Display pagination
    displayPagination(totalPages);
}

// Display orders in the table
function displayOrders(ordersToDisplay) {
    const tableBody = document.getElementById('orders-table').querySelector('tbody');
    tableBody.innerHTML = '';
    
    if (ordersToDisplay.length === 0) {
        // Create a row with a "no orders" message
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="4" class="text-center">No orders match your filters</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Display orders
    ordersToDisplay.forEach(order => {
        const orderDate = order["Order Date"] ? new Date(order["Order Date"]) : new Date(order.Timestamp);
        const formattedDate = orderDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${order["Order ID"] || order.id}</td>
            <td>${formattedDate}</td>
            <td>${formatCurrency(order["Total Price"] || 0)}</td>
            <td>
                <button class="btn btn-sm btn-primary view-order-btn" data-id="${order.id}">View Details</button>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Add event listener for view order button
        row.querySelector('.view-order-btn').addEventListener('click', function() {
            viewOrderDetails(this.getAttribute('data-id'));
        });
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

// View order details
function viewOrderDetails(orderId) {
    // Check if the order exists in our loaded orders (security check)
    const order = orders.find(o => o.id === orderId);
    if (!order) {
        console.error('Order not found:', orderId);
        showNotification('Order not found', 'error');
        return;
    }
    
    // Verify this order belongs to the current user (additional security check)
    const user = getCurrentUser();
    const userBPCode = user.bpCode || user.id || user.username || user.name;
    
    if (order["Customer ID"] !== userBPCode) {
        console.error('Unauthorized access to order:', orderId);
        console.log('Order Customer ID:', order["Customer ID"], 'User BPCode:', userBPCode);
        showNotification('You are not authorized to view this order', 'error');
        return;
    }
    
    // Set modal title
    document.querySelector('#order-modal h2').textContent = `Order #${order["Order ID"] || order.id}`;
    
    // Set order details
    const detailsContainer = document.getElementById('order-details');
    
    const orderDate = order["Order Date"] ? new Date(order["Order Date"]) : new Date(order.Timestamp);
    const formattedDate = orderDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    detailsContainer.innerHTML = `
        <div class="details-row">
            <div class="detail-item">
                <span class="detail-label">Order Date:</span>
                <span>${formattedDate}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Customer ID:</span>
                <span>${order["Customer ID"] || 'Not specified'}</span>
            </div>
        </div>
        <div class="order-items-section">
            <h3>Products Ordered</h3>
            <pre class="order-items-text">${order["Products Ordered"] || 'No products'}</pre>
        </div>
    `;
    
    // Show modal
    document.getElementById('order-modal').style.display = 'block';
}

// Close order modal
function closeOrderModal() {
    document.getElementById('order-modal').style.display = 'none';
} 