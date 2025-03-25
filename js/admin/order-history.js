// Check authorization
document.addEventListener('DOMContentLoaded', function() {
    // Only allow admin role
    if (!checkAuth(['admin'])) return;
    
    // Display current user
    const user = getCurrentUser();
    document.getElementById('current-user').textContent = user.username;
    
    // Load orders
    loadOrders();
    
    // Setup event listeners
    setupEventListeners();
});

// Global variables
let orders = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentFilters = {
    search: '',
    dateFrom: '',
    dateTo: ''
};

// Load orders from AirTable
function loadOrders() {
    console.log('Loading orders from API...');
    fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.ORDERS}`, {
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Orders API response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Orders API error response:', text);
                throw new Error(`Failed to load orders: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Raw API order data:', data);
        if (data.records && data.records.length > 0) {
            console.log('Sample order fields:', data.records[0].fields);
        }
        
        orders = data.records.map(record => ({
            id: record.id,
            ...record.fields
        }));
        
        // Sort orders by Order Date (newest first)
        orders.sort((a, b) => {
            const dateA = a['Order Date'] ? new Date(a['Order Date']) : new Date(0);
            const dateB = b['Order Date'] ? new Date(b['Order Date']) : new Date(0);
            return dateB - dateA;
        });
        
        console.log('Processed orders:', orders);
        applyFiltersAndDisplay();
    })
    .catch(error => {
        console.error('Error loading orders:', error);
        showNotification('Failed to load orders', 'error');
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search and filter controls
    const searchInput = document.getElementById('search-order');
    const dateFromInput = document.getElementById('date-from');
    const dateToInput = document.getElementById('date-to');
    const filterBtn = document.getElementById('filter-btn');
    
    // Search as you type
    searchInput.addEventListener('input', function() {
        currentFilters.search = this.value;
        currentPage = 1;
        applyFiltersAndDisplay();
    });
    
    // Date inputs
    dateFromInput.addEventListener('change', function() {
        currentFilters.dateFrom = this.value;
    });
    
    dateToInput.addEventListener('change', function() {
        currentFilters.dateTo = this.value;
    });
    
    // Apply button for date filters
    filterBtn.addEventListener('click', function() {
        currentPage = 1;
        applyFiltersAndDisplay();
        updateActiveQuickFilter('none');
    });
    
    // Quick Filter buttons
    const todayBtn = document.getElementById('filter-today');
    const thisMonthBtn = document.getElementById('filter-this-month');
    const allBtn = document.getElementById('filter-all');
    
    todayBtn.addEventListener('click', function() {
        applyQuickFilter('today');
        updateActiveQuickFilter('today');
    });
    
    thisMonthBtn.addEventListener('click', function() {
        applyQuickFilter('this-month');
        updateActiveQuickFilter('this-month');
    });
    
    allBtn.addEventListener('click', function() {
        applyQuickFilter('all');
        updateActiveQuickFilter('all');
    });
    
    // Set All as the default active filter
    updateActiveQuickFilter('all');
    
    // Modal close button
    const closeModal = document.querySelector('#order-modal .close');
    closeModal.addEventListener('click', function() {
        document.getElementById('order-modal').style.display = 'none';
    });
    
    // Download options dropdown
    const downloadBtn = document.getElementById('download-options-btn');
    const dropdown = document.getElementById('download-dropdown');
    
    downloadBtn.addEventListener('click', function() {
        dropdown.classList.toggle('show-dropdown');
    });
    
    // Close dropdown when clicking outside
    window.addEventListener('click', function(event) {
        if (!event.target.matches('#download-options-btn')) {
            if (dropdown.classList.contains('show-dropdown')) {
                dropdown.classList.remove('show-dropdown');
            }
        }
    });
    
    // Download dropdown options
    document.getElementById('download-csv').addEventListener('click', function(e) {
        e.preventDefault();
        showDownloadOptionsModal('csv');
    });
    
    document.getElementById('download-json').addEventListener('click', function(e) {
        e.preventDefault();
        showDownloadOptionsModal('json');
    });
    
    document.getElementById('download-pdf').addEventListener('click', function(e) {
        e.preventDefault();
        showDownloadOptionsModal('pdf');
    });
    
    // Download options modal functionality
    setupDownloadOptionsModal();
}

// Setup download options modal
function setupDownloadOptionsModal() {
    const modal = document.getElementById('download-options-modal');
    const closeBtn = modal.querySelector('.close');
    const cancelBtn = document.getElementById('cancel-download');
    const downloadBtn = document.getElementById('start-download');
    
    // Close modal actions
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    cancelBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Start download
    downloadBtn.addEventListener('click', function() {
        processDownloadWithOptions();
    });
    
    // Toggle date inputs based on radio selection
    document.getElementById('date-option-all').addEventListener('change', toggleDateInputs);
    document.getElementById('date-option-custom').addEventListener('change', toggleDateInputs);
    document.getElementById('date-option-current').addEventListener('change', toggleDateInputs);
    
    // Initialize date inputs state
    toggleDateInputs();
}

// Toggle date input fields based on selected option
function toggleDateInputs() {
    const dateFields = document.querySelectorAll('#download-date-from, #download-date-to');
    const customSelected = document.getElementById('date-option-custom').checked;
    
    dateFields.forEach(field => {
        field.disabled = !customSelected;
    });
}

// Show the download options modal with pre-selected format
function showDownloadOptionsModal(format) {
    // Pre-select the format
    document.getElementById('format-option-csv').checked = format === 'csv';
    document.getElementById('format-option-json').checked = format === 'json';
    document.getElementById('format-option-pdf').checked = format === 'pdf';
    
    // Clear customer filters
    document.getElementById('customer-name-filter').value = '';
    document.getElementById('bp-code-filter').value = '';
    
    // Show the modal
    document.getElementById('download-options-modal').style.display = 'block';
}

// Process download with selected options
function processDownloadWithOptions() {
    // Get file format
    let format = 'json';
    if (document.getElementById('format-option-csv').checked) format = 'csv';
    if (document.getElementById('format-option-pdf').checked) format = 'pdf';
    
    // Get date range options
    const useCustomDates = document.getElementById('date-option-custom').checked;
    const useCurrentFilters = document.getElementById('date-option-current').checked;
    
    // Get customer filters
    const customerNameFilter = document.getElementById('customer-name-filter').value.trim();
    const bpCodeFilter = document.getElementById('bp-code-filter').value.trim();
    
    // Determine date range to use
    let dateRange = {};
    if (useCustomDates) {
        dateRange.from = document.getElementById('download-date-from').value;
        dateRange.to = document.getElementById('download-date-to').value;
    } else if (useCurrentFilters) {
        dateRange.from = currentFilters.dateFrom;
        dateRange.to = currentFilters.dateTo;
    }
    
    // Create customer filter object
    const customerFilters = {
        name: customerNameFilter,
        bpCode: bpCodeFilter
    };
    
    // Hide modal
    document.getElementById('download-options-modal').style.display = 'none';
    
    // Download orders only
    downloadOrdersWithFilters(format, dateRange, customerFilters);
}

// Download orders with specified filters
function downloadOrdersWithFilters(format, dateRange, customerFilters) {
    // Filter orders by various criteria
    let ordersToDownload = [...orders];
    
    // Apply date filtering
    if (dateRange.from) {
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        ordersToDownload = ordersToDownload.filter(order => {
            if (!order['Order Date']) return false;
            const orderDate = new Date(order['Order Date']);
            return orderDate >= fromDate;
        });
    }
    
    if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        ordersToDownload = ordersToDownload.filter(order => {
            if (!order['Order Date']) return false;
            const orderDate = new Date(order['Order Date']);
            return orderDate <= toDate;
        });
    }
    
    // Apply customer name filter
    if (customerFilters.name) {
        const nameFilter = customerFilters.name.toLowerCase();
        ordersToDownload = ordersToDownload.filter(order => {
            // Check if order has CustomerName field or similar
            return (order['Customer Name'] && order['Customer Name'].toLowerCase().includes(nameFilter)) ||
                   (order['CustomerName'] && order['CustomerName'].toLowerCase().includes(nameFilter)) ||
                   (order['Customer ID'] && order['Customer ID'].toLowerCase().includes(nameFilter));
        });
    }
    
    // Apply BP code filter
    if (customerFilters.bpCode) {
        const bpFilter = customerFilters.bpCode.toLowerCase();
        ordersToDownload = ordersToDownload.filter(order => {
            // Check if order has BPCode field or similar
            return (order['BPCode'] && order['BPCode'].toLowerCase().includes(bpFilter)) ||
                   (order['BP Code'] && order['BP Code'].toLowerCase().includes(bpFilter)) ||
                   // Also check Customer ID as it might contain BP code
                   (order['Customer ID'] && order['Customer ID'].toLowerCase().includes(bpFilter));
        });
    }
    
    if (ordersToDownload.length === 0) {
        showNotification('No orders found matching the selected filters', 'error');
        return;
    }
    
    downloadOrders(format, ordersToDownload);
}

// Download orders in specified format
function downloadOrders(format, ordersToDownload = null) {
    // Use provided orders or get filtered orders
    const dataToDownload = ordersToDownload || getFilteredOrders();
    
    if (dataToDownload.length === 0) {
        showNotification('No orders to download', 'error');
        return;
    }
    
    const filename = `order_history_${new Date().toISOString().slice(0, 10)}`;
    
    switch (format) {
        case 'csv':
            downloadAsCSV(dataToDownload, `${filename}.csv`);
            break;
            
        case 'json':
            downloadAsJSON(dataToDownload, `${filename}.json`);
            break;
            
        case 'pdf':
            generatePDF(dataToDownload);
            break;
            
        default:
            showNotification('Invalid format', 'error');
            return;
    }
}

// Download data as CSV
function downloadAsCSV(data, filename) {
    const content = convertToCSV(data);
    const mimeType = 'text/csv;charset=utf-8;';
    createDownloadLink(content, filename, mimeType);
    showNotification(`Downloaded as CSV`, 'success');
}

// Download data as JSON
function downloadAsJSON(data, filename) {
    const content = JSON.stringify(data, null, 2);
    const mimeType = 'application/json;charset=utf-8;';
    createDownloadLink(content, filename, mimeType);
    showNotification(`Downloaded as JSON`, 'success');
}

// Create and trigger download link
function createDownloadLink(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Convert orders to CSV format
function convertToCSV(data) {
    if (data.length === 0) return '';
    
    // Get headers (keys from the first order)
    const headers = [
        'Order ID',
        'Customer ID',
        'Order Date',
        'Total Price',
        'Products Ordered',
        'Timestamp'
    ];
    
    // Create CSV header row
    let csvContent = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach(order => {
        const row = [
            `"${(order['Order ID'] || '').replace(/"/g, '""')}"`,
            `"${(order['Customer ID'] || '').replace(/"/g, '""')}"`,
            `"${order['Order Date'] ? new Date(order['Order Date']).toISOString() : ''}"`,
            `"${order['Total Price'] || 0}"`,
            `"${(order['Products Ordered'] || '').replace(/"/g, '""')}"`,
            `"${order['Timestamp'] ? new Date(order['Timestamp']).toISOString() : ''}"`,
        ];
        
        csvContent += row.join(',') + '\n';
    });
    
    return csvContent;
}

// Generate PDF for orders
function generatePDF(data) {
    // This is a simplified version - in a real environment, you might use a library like jsPDF
    // For now, we'll create a simple styled HTML and print it
    const printWindow = window.open('', '_blank');
    
    // Add CSS styling
    const html = `
        <html>
        <head>
            <title>Order History</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #2c3e50; text-align: center; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f8f9fa; font-weight: bold; }
                .date { color: #6c757d; font-size: 14px; text-align: right; margin-bottom: 30px; }
                .footer { text-align: center; font-size: 12px; color: #6c757d; margin-top: 50px; }
            </style>
        </head>
        <body>
            <h1>Order History</h1>
            <div class="date">Generated on: ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', month: 'long', day: 'numeric' 
            })}</div>
            
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(order => `
                        <tr>
                            <td>${order['Order ID'] || 'N/A'}</td>
                            <td>${order['Customer ID'] || 'N/A'}</td>
                            <td>${order['Order Date'] ? new Date(order['Order Date']).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric'
                            }) : 'N/A'}</td>
                            <td>${formatCurrency(order['Total Price']) || '$0.00'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                Generated from Order Management System
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
}

// Filter and display orders
function applyFiltersAndDisplay() {
    let filteredOrders = orders;
    
    // Apply search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredOrders = filteredOrders.filter(order => 
            (order['Order ID'] && order['Order ID'].toLowerCase().includes(searchTerm)) || 
            (order['Customer ID'] && order['Customer ID'].toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply date from filter
    if (currentFilters.dateFrom) {
        const fromDate = new Date(currentFilters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filteredOrders = filteredOrders.filter(order => {
            if (!order['Order Date']) return false;
            const orderDate = new Date(order['Order Date']);
            return orderDate >= fromDate;
        });
    }
    
    // Apply date to filter
    if (currentFilters.dateTo) {
        const toDate = new Date(currentFilters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredOrders = filteredOrders.filter(order => {
            if (!order['Order Date']) return false;
            const orderDate = new Date(order['Order Date']);
            return orderDate <= toDate;
        });
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
    const tableBody = document.querySelector('#orders-table tbody');
    tableBody.innerHTML = '';
    
    if (ordersToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" class="text-center">No orders found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    ordersToDisplay.forEach(order => {
        const row = document.createElement('tr');
        
        // Format date
        const orderDate = order['Order Date'] ? new Date(order['Order Date']) : null;
        const formattedDate = orderDate 
            ? orderDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })
            : 'N/A';
        
        row.innerHTML = `
            <td>${order['Order ID'] || 'N/A'}</td>
            <td>${order['Customer ID'] || 'N/A'}</td>
            <td>${formattedDate}</td>
            <td>${formatCurrency(order['Total Price']) || '$0.00'}</td>
            <td>
                <button class="btn btn-sm" onclick="viewOrderDetails('${order.id}')">View Details</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// View order details
function viewOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    document.getElementById('order-id').textContent = order['Order ID'] || 'N/A';
    document.getElementById('order-customer').textContent = order['Customer ID'] || 'N/A';
    
    // Format dates
    const orderDate = order['Order Date'] ? new Date(order['Order Date']) : null;
    const formattedOrderDate = orderDate 
        ? orderDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        : 'N/A';
    
    const timestamp = order['Timestamp'] ? new Date(order['Timestamp']) : null;
    const formattedTimestamp = timestamp 
        ? timestamp.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        : 'N/A';
    
    document.getElementById('order-date').textContent = formattedOrderDate;
    document.getElementById('order-timestamp').textContent = formattedTimestamp;
    document.getElementById('order-total').textContent = formatCurrency(order['Total Price']) || '$0.00';
    
    // Display products ordered
    const productsContainer = document.getElementById('products-ordered');
    productsContainer.innerHTML = '';
    
    if (order['Products Ordered']) {
        try {
            // Try to parse as JSON
            let productsHtml = '';
            try {
                const productsJson = JSON.parse(order['Products Ordered']);
                productsHtml = `<div class="product-list">`;
                productsJson.forEach(product => {
                    productsHtml += `
                        <div class="product-item">
                            <div class="product-name">${product.name || 'Unknown Product'}</div>
                            <div class="product-details">
                                ${product.price ? `<span>Price: ${formatCurrency(product.price)}</span>` : ''}
                                ${product.quantity ? `<span>Quantity: ${product.quantity}</span>` : ''}
                            </div>
                        </div>
                    `;
                });
                productsHtml += `</div>`;
            } catch (e) {
                // If not JSON, display as text
                productsHtml = `<div class="product-text">${order['Products Ordered']}</div>`;
            }
            productsContainer.innerHTML = productsHtml;
        } catch (e) {
            productsContainer.innerHTML = `<div class="product-text">${order['Products Ordered']}</div>`;
        }
    } else {
        productsContainer.innerHTML = '<p>No product information available</p>';
    }
    
    // Show modal
    document.getElementById('order-modal').style.display = 'block';
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
    
    // Page numbers - show limited number to avoid stacking
    let showPages = Math.min(5, totalPages);
    let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
    let endPage = Math.min(totalPages, startPage + showPages - 1);
    
    if (endPage - startPage + 1 < showPages) {
        startPage = Math.max(1, endPage - showPages + 1);
    }
    
    // First page if not in range
    if (startPage > 1) {
        const firstPageBtn = document.createElement('button');
        firstPageBtn.classList.add('btn', 'btn-sm');
        firstPageBtn.textContent = '1';
        firstPageBtn.addEventListener('click', () => {
            currentPage = 1;
            applyFiltersAndDisplay();
        });
        paginationDiv.appendChild(firstPageBtn);
        
        // Ellipsis if needed
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationDiv.appendChild(ellipsis);
        }
    }
    
    // Page numbers
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
    
    // Last page if not in range
    if (endPage < totalPages) {
        // Ellipsis if needed
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            paginationDiv.appendChild(ellipsis);
        }
        
        const lastPageBtn = document.createElement('button');
        lastPageBtn.classList.add('btn', 'btn-sm');
        lastPageBtn.textContent = totalPages;
        lastPageBtn.addEventListener('click', () => {
            currentPage = totalPages;
            applyFiltersAndDisplay();
        });
        paginationDiv.appendChild(lastPageBtn);
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

// Get filtered orders based on current filters
function getFilteredOrders() {
    let filteredOrders = orders;
    
    // Apply search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredOrders = filteredOrders.filter(order => 
            (order['Order ID'] && order['Order ID'].toLowerCase().includes(searchTerm)) || 
            (order['Customer ID'] && order['Customer ID'].toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply date from filter
    if (currentFilters.dateFrom) {
        const fromDate = new Date(currentFilters.dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        filteredOrders = filteredOrders.filter(order => {
            if (!order['Order Date']) return false;
            const orderDate = new Date(order['Order Date']);
            return orderDate >= fromDate;
        });
    }
    
    // Apply date to filter
    if (currentFilters.dateTo) {
        const toDate = new Date(currentFilters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        filteredOrders = filteredOrders.filter(order => {
            if (!order['Order Date']) return false;
            const orderDate = new Date(order['Order Date']);
            return orderDate <= toDate;
        });
    }
    
    return filteredOrders;
}

// Apply quick filter to the orders
function applyQuickFilter(filter) {
    // Reset any existing search filter
    document.getElementById('search-order').value = '';
    currentFilters.search = '';
    
    // Reset page
    currentPage = 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Format date as YYYY-MM-DD for input elements
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    // Apply filter based on selection
    switch (filter) {
        case 'today':
            // Set date range to today only
            const todayStr = formatDateForInput(today);
            currentFilters.dateFrom = todayStr;
            currentFilters.dateTo = todayStr;
            
            // Update date inputs
            document.getElementById('date-from').value = todayStr;
            document.getElementById('date-to').value = todayStr;
            break;
            
        case 'this-month':
            // Set date range to current month
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            currentFilters.dateFrom = formatDateForInput(firstDayOfMonth);
            currentFilters.dateTo = formatDateForInput(lastDayOfMonth);
            
            // Update date inputs
            document.getElementById('date-from').value = currentFilters.dateFrom;
            document.getElementById('date-to').value = currentFilters.dateTo;
            break;
            
        case 'all':
            // Clear date filters
            currentFilters.dateFrom = '';
            currentFilters.dateTo = '';
            
            // Clear date inputs
            document.getElementById('date-from').value = '';
            document.getElementById('date-to').value = '';
            break;
    }
    
    // Apply filters and update display
    applyFiltersAndDisplay();
}

// Update active quick filter button
function updateActiveQuickFilter(activeFilter) {
    // Remove active class from all buttons
    document.getElementById('filter-today').classList.remove('btn-primary');
    document.getElementById('filter-this-month').classList.remove('btn-primary');
    document.getElementById('filter-all').classList.remove('btn-primary');
    
    // Add active class to the selected button
    if (activeFilter === 'today') {
        document.getElementById('filter-today').classList.add('btn-primary');
    } else if (activeFilter === 'this-month') {
        document.getElementById('filter-this-month').classList.add('btn-primary');
    } else if (activeFilter === 'all') {
        document.getElementById('filter-all').classList.add('btn-primary');
    }
} 