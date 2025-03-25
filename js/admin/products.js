// Check authorization
document.addEventListener('DOMContentLoaded', function() {
    // Only allow admin role
    if (!checkAuth(['admin'])) return;
    
    // Display current user
    const user = getCurrentUser();
    document.getElementById('current-user').textContent = user.username;
    
    // Load products
    loadProducts();
    
    // Setup event listeners
    setupEventListeners();
});

// Global variables
let products = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentFilters = {
    search: ''
};

// BP Code management
let bpCodes = []; // Array to store BP codes

// Load products from AirTable
function loadProducts() {
    console.log('Loading products from API...');
    fetch(`${API_URL}/Products`, {
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('Products API response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Products API error response:', text);
                throw new Error(`Failed to load products: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Raw API product data:', data);
        if (data.records && data.records.length > 0) {
            console.log('Sample product fields:', data.records[0].fields);
        }
        
        products = data.records.map(record => ({
            id: record.id,
            ...record.fields
        }));
        
        console.log('Processed products:', products);
        applyFiltersAndDisplay();
    })
    .catch(error => {
        console.error('Error loading products:', error);
        showNotification('Failed to load products', 'error');
    });
}

// Setup event listeners
function setupEventListeners() {
    // Add product button
    const addProductBtn = document.getElementById('add-product-btn');
    addProductBtn.addEventListener('click', showAddProductModal);
    
    // Close modal
    const closeModal = document.querySelector('#product-modal .close');
    closeModal.addEventListener('click', closeProductModal);
    
    // Product form submit
    const productForm = document.getElementById('product-form');
    productForm.addEventListener('submit', saveProduct);
    
    // Image URL input - update preview
    const imageUrlInput = document.getElementById('product-image');
    imageUrlInput.addEventListener('input', updateImagePreview);
    
    // BP Code buttons
    const addBPCodeBtn = document.querySelector('.btn-add-bp-code');
    addBPCodeBtn.addEventListener('click', addBPCode);
    
    const bpCodeInput = document.querySelector('.bp-code-input');
    bpCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            addBPCode();
        }
    });
    
    // Delete confirmation modal buttons
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    confirmDeleteBtn.addEventListener('click', deleteProduct);
    
    // Search and filters
    const searchInput = document.getElementById('search-product');
    
    searchInput.addEventListener('input', function() {
        currentFilters.search = this.value;
        currentPage = 1;
        applyFiltersAndDisplay();
    });
}

// BP Code management
function addBPCode() {
    const input = document.querySelector('.bp-code-input');
    const value = input.value.trim();
    
    if (value && !bpCodes.includes(value)) {
        bpCodes.push(value);
        renderBPCodes();
        input.value = '';
    }
    
    input.focus();
}

function removeBPCode(index) {
    bpCodes.splice(index, 1);
    renderBPCodes();
}

function renderBPCodes() {
    const container = document.getElementById('bp-codes-list');
    container.innerHTML = '';
    
    bpCodes.forEach((code, index) => {
        const item = document.createElement('div');
        item.className = 'bp-code-item';
        item.innerHTML = `
            <span>${code}</span>
            <button type="button" class="bp-code-remove" data-index="${index}">&times;</button>
        `;
        container.appendChild(item);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.bp-code-remove').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeBPCode(index);
        });
    });
}

// Update image preview based on URL input
function updateImagePreview() {
    const imageUrl = document.getElementById('product-image').value;
    const imagePreviewContainer = document.getElementById('image-preview-container');
    
    if (!imagePreviewContainer) return;
    
    if (imageUrl && imageUrl.trim() !== '') {
        imagePreviewContainer.innerHTML = `<img src="${imageUrl}" alt="Product Image Preview" class="image-preview">`;
    } else {
        const noImageSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
                <path fill="#adb5bd" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/>
            </svg>`;
        imagePreviewContainer.innerHTML = `<div class="no-image-preview">${noImageSvg}</div>`;
    }
}

// Filter and display products
function applyFiltersAndDisplay() {
    let filteredProducts = products;
    
    // Apply search filter
    if (currentFilters.search) {
        const searchTerm = currentFilters.search.toLowerCase();
        filteredProducts = filteredProducts.filter(product => 
            (product.Name && product.Name.toLowerCase().includes(searchTerm)) || 
            (product.Description && product.Description.toLowerCase().includes(searchTerm))
        );
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productsToDisplay = filteredProducts.slice(startIndex, endIndex);
    
    // Display products
    displayProducts(productsToDisplay);
    
    // Display pagination
    displayPagination(totalPages);
}

// Display products in the table
function displayProducts(productsToDisplay) {
    const tableBody = document.querySelector('#products-table tbody');
    tableBody.innerHTML = '';
    
    if (productsToDisplay.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">No products found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    productsToDisplay.forEach(product => {
        const row = document.createElement('tr');
        
        // Check if the product has an image URL
        const hasImage = product.ImageURL && product.ImageURL.trim() !== '';
        const noImageSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
                <path fill="#adb5bd" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5-7l-3 3.72L9 13l-3 4h12l-4-5z"/>
            </svg>`;
        
        const imageContent = hasImage 
            ? `<img src="${product.ImageURL}" alt="${product.Name || 'Product'}">`
            : `<div class="no-image-placeholder">${noImageSvg}</div>`;
        
        // Display special price if available
        const priceDisplay = product.SpecialPrice 
            ? `<span class="special-price" data-discount="-${Math.round((1 - product.SpecialPrice/product.Price) * 100)}%">${formatCurrency(product.Price)}</span><br><span class="current-price">${formatCurrency(product.SpecialPrice)}</span>` 
            : formatCurrency(product.Price);
        
        // Handle multiple BP codes
        let bpCodeDisplay = '';
        if (product.BPCode) {
            if (typeof product.BPCode === 'string' && product.BPCode.includes(',')) {
                // Multiple BP codes
                const codes = product.BPCode.split(',').map(code => code.trim()).filter(code => code);
                bpCodeDisplay = `<div class="bp-code-multiple-tag">BP: ${codes.map(code => `<span>${code}</span>`).join('')}</div>`;
            } else {
                // Single BP code
                bpCodeDisplay = `<small class="bp-code-tag">BP: ${product.BPCode}</small>`;
            }
        }
        
        row.innerHTML = `
            <td><div class="product-img-small">${imageContent}</div></td>
            <td>${product.Name || ''}${bpCodeDisplay}</td>
            <td>${priceDisplay}</td>
            <td>
                <button class="btn btn-sm" onclick="editProduct('${product.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteProduct('${product.id}')">Delete</button>
            </td>
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

// Show add product modal
function showAddProductModal() {
    document.getElementById('modal-title').textContent = 'Add New Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = '';
    
    // Clear BP codes
    bpCodes = [];
    renderBPCodes();
    
    // Initialize empty image preview
    updateImagePreview();
    
    document.getElementById('product-modal').style.display = 'block';
}

// Close product modal
function closeProductModal() {
    document.getElementById('product-modal').style.display = 'none';
}

// Edit product
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('modal-title').textContent = 'Edit Product';
    document.getElementById('product-id').value = productId;
    document.getElementById('product-name').value = product.Name || '';
    document.getElementById('product-description').value = product.Description || '';
    document.getElementById('product-price').value = product.Price || '';
    document.getElementById('product-special-price').value = product.SpecialPrice || '';
    
    // Handle BP codes
    if (product.BPCode) {
        if (typeof product.BPCode === 'string') {
            // Split comma-separated BP codes
            bpCodes = product.BPCode.split(',').map(code => code.trim()).filter(code => code);
        } else {
            bpCodes = [product.BPCode];
        }
        renderBPCodes();
    } else {
        bpCodes = [];
        renderBPCodes();
    }
    
    document.getElementById('product-image').value = product.ImageURL || '';
    
    // Update image preview
    updateImagePreview();
    
    document.getElementById('product-modal').style.display = 'block';
}

// Save product (create or update)
function saveProduct(event) {
    event.preventDefault();
    
    const productId = document.getElementById('product-id').value;
    const isEditing = !!productId;
    const currentUser = getCurrentUser();
    
    // Build product data - ensure correct field formatting for Airtable
    const priceValue = document.getElementById('product-price').value;
    const specialPriceValue = document.getElementById('product-special-price').value;
    
    const productData = {
        Name: document.getElementById('product-name').value,
        Description: document.getElementById('product-description').value,
        Price: priceValue ? parseFloat(priceValue) : 0, // Ensure Price is a number or 0
        ImageURL: document.getElementById('product-image').value
    };
    
    // Add optional fields if they have values
    if (specialPriceValue && specialPriceValue.trim() !== '') {
        productData.SpecialPrice = parseFloat(specialPriceValue);
    }
    
    // Add BP Codes (joined with commas)
    if (bpCodes.length > 0) {
        productData.BPCode = bpCodes.join(',');
    }
    
    // Remove any empty or undefined fields which Airtable might reject
    Object.keys(productData).forEach(key => {
        if (productData[key] === '' || productData[key] === undefined) {
            delete productData[key];
        }
    });
    
    console.log('Saving product data:', productData);
    
    // API call to create or update product
    const method = isEditing ? 'PATCH' : 'POST';
    const url = isEditing 
        ? `${API_URL}/Products/${productId}`
        : `${API_URL}/Products`;
    
    console.log('Making API request to:', url, 'with method:', method);
    
    // Show loading notification
    showNotification('Saving product...', 'info');
    
    // Send API request with retry logic for rate limiting
    makeRequestWithRetry(url, method, productData, 0)
        .then(data => {
            console.log('API success response:', data);
            // Update local data
            if (isEditing) {
                const productIndex = products.findIndex(p => p.id === productId);
                if (productIndex !== -1) {
                    products[productIndex] = {
                        id: productId,
                        ...productData
                    };
                }
            } else {
                products.push({
                    id: data.id,
                    ...productData
                });
            }
            
            // Log the action
            logAccess(
                currentUser.id,
                isEditing ? 'Product Updated' : 'Product Created',
                `${currentUser.username} ${isEditing ? 'updated' : 'created'} product ${productData.Name}`
            );
            
            closeProductModal();
            showNotification(`Product ${isEditing ? 'updated' : 'created'} successfully`);
            applyFiltersAndDisplay();
        })
        .catch(error => {
            console.error('Detailed error saving product:', error);
            
            // Check for specific error types
            if (error.name === 'TypeError' && error.message.includes('networkerror')) {
                showNotification('Network error - please check your internet connection', 'error');
            } else if (!AIRTABLE_CONFIG || !AIRTABLE_CONFIG.API_KEY) {
                showNotification('API key is missing or invalid', 'error');
            } else if (!API_URL) {
                showNotification('API URL is not configured properly', 'error');
            } else if (error.message.includes('CORS')) {
                showNotification('CORS error - This may be a browser security restriction', 'error');
            } else {
                showNotification(`Failed to save product: ${error.message}`, 'error');
            }
        });
}

// Helper function to make API request with retry logic for rate limiting
function makeRequestWithRetry(url, method, productData, retryCount, maxRetries = 3) {
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fields: productData
            })
        })
        .then(response => {
            console.log('API response status:', response.status);
            
            // Check for rate limiting (429 Too Many Requests)
            if (response.status === 429 && retryCount < maxRetries) {
                const retryAfter = response.headers.get('Retry-After') || 1;
                console.log(`Rate limited. Retrying in ${retryAfter} seconds...`);
                showNotification(`Rate limited. Retrying in ${retryAfter} seconds...`, 'info');
                
                // Wait and retry
                setTimeout(() => {
                    makeRequestWithRetry(url, method, productData, retryCount + 1, maxRetries)
                        .then(resolve)
                        .catch(reject);
                }, retryAfter * 1000);
                return;
            }
            
            // Handle other errors
            if (!response.ok) {
                return response.text().then(text => {
                    console.error('API error response:', text);
                    throw new Error(`Failed to save product: ${response.status} ${response.statusText}`);
                });
            }
            
            return response.json();
        })
        .then(data => {
            if (data) resolve(data);
        })
        .catch(reject);
    });
}

// Show delete confirmation modal
let productToDelete = null;
function confirmDeleteProduct(productId) {
    productToDelete = productId;
    document.getElementById('delete-confirm-modal').style.display = 'block';
}

// Delete product
function deleteProduct() {
    if (!productToDelete) return;
    
    const productId = productToDelete;
    const product = products.find(p => p.id === productId);
    
    if (!product) {
        closeDeleteModal();
        return;
    }
    
    const currentUser = getCurrentUser();
    showNotification('Deleting product...', 'info');
    
    fetch(`${API_URL}/Products/${productId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.error('API error response:', text);
                throw new Error(`Failed to delete product: ${response.status} ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(() => {
        // Remove product from local array
        products = products.filter(p => p.id !== productId);
        
        // Log the action
        logAccess(
            currentUser.id,
            'Product Deleted',
            `${currentUser.username} deleted product ${product.Name}`
        );
        
        closeDeleteModal();
        showNotification('Product deleted successfully');
        applyFiltersAndDisplay();
    })
    .catch(error => {
        console.error('Error deleting product:', error);
        showNotification(`Failed to delete product: ${error.message}`, 'error');
        closeDeleteModal();
    });
}

// Close delete confirmation modal
function closeDeleteModal() {
    document.getElementById('delete-confirm-modal').style.display = 'none';
    productToDelete = null;
} 