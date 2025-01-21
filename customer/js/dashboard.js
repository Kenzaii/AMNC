// Airtable Configuration
const AIRTABLE_URL = 'https://api.airtable.com/v0';
const BASE_ID = 'appipp8LFUGElp3Di';
const API_KEY = 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542';

// Initialize cart
window.cart = window.cart || [];

// Helper function to show errors
function showError(message) {
    const mainContainer = document.getElementById('mainContainer');
    if (mainContainer) {
        mainContainer.innerHTML = `
            <div class="alert alert-danger">
                <h4 class="alert-heading">Error</h4>
                <p>${message}</p>
                <hr>
                <button class="btn btn-outline-danger" onclick="window.location.reload()">
                    <i class="fas fa-sync"></i> Refresh Page
                </button>
            </div>
        `;
    }
}

// Add this helper function
function getBaseUrl() {
    const currentUrl = new URL(window.location.href);
    return currentUrl.origin + currentUrl.pathname.split('/customer/')[0];
}

// Add this helper function to handle both HTTP and file protocols
function getLoginPath() {
    const isFileProtocol = window.location.protocol === 'file:';
    
    if (isFileProtocol) {
        // For file:// protocol
        const currentPath = decodeURIComponent(window.location.pathname);
        const pathParts = currentPath.split('/');
        const rootIndex = pathParts.findIndex(part => part === 'OrderSys-main');
        
        if (rootIndex !== -1) {
            // Reconstruct the path to login.html
            const baseParts = pathParts.slice(0, rootIndex + 1);
            const loginPath = [...baseParts, 'login.html'].join('/');
            console.log('Constructed login path:', loginPath);
            return 'file:///' + loginPath.replace(/^\//, '');
        }
    }
    
    // For http:// protocol
    const baseUrl = getBaseUrl();
    return baseUrl + '/login.html';
}

// Add this at the top of the file
function dumpState(label) {
    console.group(label);
    console.log('localStorage:', { ...localStorage });
    console.log('sessionStorage:', { ...sessionStorage });
    console.log('Current URL:', window.location.href);
    console.log('Current Path:', window.location.pathname);
    console.log('Protocol:', window.location.protocol);
    console.groupEnd();
}

// Update the checkAuth function
function checkAuth() {
    dumpState('Starting auth check');
    
    // Try to restore data from sessionStorage if localStorage is empty
    if (!localStorage.getItem('username') && sessionStorage.getItem('username')) {
        console.log('Restoring data from sessionStorage');
        ['username', 'customerId', 'userRole', 'userId'].forEach(key => {
            const value = sessionStorage.getItem(key);
            if (value) {
                localStorage.setItem(key, value);
            }
        });
    }
    
    const authData = {
        username: localStorage.getItem('username'),
        customerId: localStorage.getItem('customerId'),
        userRole: localStorage.getItem('userRole'),
        userId: localStorage.getItem('userId'),
        allData: { 
            localStorage: { ...localStorage },
            sessionStorage: { ...sessionStorage }
        }
    };
    
    console.log('Auth data:', authData);
    
    // Check if we have the required data
    const isAuthenticated = authData.username && authData.customerId;
    // Allow both 'customer' role and null/undefined role (for backward compatibility)
    const isCustomer = !authData.userRole || authData.userRole === 'customer' || authData.userRole === 'user';
    
    if (!isAuthenticated || !isCustomer) {
        console.log('Authentication failed:', {
            hasUsername: !!authData.username,
            hasCustomerId: !!authData.customerId,
            role: authData.userRole,
            isCustomer,
            expectedRole: 'customer or user'
        });
        
        // Store the intended destination
        const currentPath = decodeURIComponent(window.location.pathname);
        sessionStorage.setItem('redirectAfterLogin', currentPath);
        console.log('Stored redirect path:', currentPath);
        
        // Clear storage
        localStorage.clear();
        sessionStorage.clear();
        console.log('Cleared storage');
        
        // Get login path and redirect
        const loginPath = getLoginPath();
        console.log('Will redirect to:', loginPath);
        
        dumpState('Before redirect to login');
        window.location.href = loginPath;
        return false;
    }
    
    console.log('Authentication successful');
    dumpState('After successful auth');
    return true;
}

// Add this helper function to get the correct base path
function getBasePath() {
    const path = window.location.pathname;
    const parts = path.split('/');
    return parts.slice(0, -2).join('/') + '/';
}

// API request helper
async function makeAPIRequest(table) {
    if (!checkAuth()) return null;
    
    const url = `${AIRTABLE_URL}/${BASE_ID}/${table}`;
    console.log('Making API request to:', url);
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${table}:`, error);
        throw error;
    }
}

// Function to normalize text for comparison
function normalizeText(text) {
    return text.toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// Function to extract product name from order text
function extractProductName(orderText) {
    // Remove quantity and price information
    return orderText.replace(/\(.*?\)/g, '').trim();
}

// Function to load favorite products
async function loadFavoriteProducts() {
    console.log('Loading favorite products...');
    
    const favoritesList = document.getElementById('favoriteProducts');
    if (!favoritesList) {
        console.error('Favorites container not found');
        return;
    }

    try {
        // Get current customer ID
        const customerId = localStorage.getItem('customerId');
        if (!customerId) {
            throw new Error('Customer ID not found');
        }

        console.log('Loading favorites for customer:', customerId);

        // Get orders for this customer only
        const filterFormula = encodeURIComponent(`{Customer ID}="${customerId}"`);
        const ordersResponse = await fetch(
            `${AIRTABLE_URL}/${BASE_ID}/Orders?filterByFormula=${filterFormula}`,
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!ordersResponse.ok) {
            throw new Error('Failed to fetch orders');
        }

        const ordersData = await ordersResponse.json();
        console.log('Customer orders:', ordersData);

        // Get all products
        const productsResponse = await fetch(`${AIRTABLE_URL}/${BASE_ID}/Products`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!productsResponse.ok) {
            throw new Error('Failed to fetch products');
        }

        const productsData = await productsResponse.json();
        
        // Create a map of products for easy lookup
        const productsMap = new Map(
            productsData.records.map(product => [
                normalizeText(product.fields.Name),
                product
            ])
        );

        // Count product occurrences in orders
        const productCounts = new Map();
        ordersData.records.forEach(order => {
            const orderText = order.fields['Products Ordered'];
            if (!orderText) return;

            // Extract base product name
            const cleanProductName = normalizeText(extractProductName(orderText));
            
            // Try to find matching product
            let matchedProduct = null;
            for (const [productName, product] of productsMap.entries()) {
                if (cleanProductName.includes(productName) || 
                    productName.includes(cleanProductName)) {
                    matchedProduct = product;
                    break;
                }
            }
            
            if (matchedProduct) {
                const currentCount = productCounts.get(matchedProduct.id) || 0;
                // Extract quantity if available
                const quantityMatch = orderText.match(/(?:Quantity:|Qty:|x)\s*(\d+)/i);
                const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
                productCounts.set(matchedProduct.id, currentCount + quantity);
                
                console.log('Product match found:', {
                    orderText,
                    cleanName: cleanProductName,
                    matchedProduct: matchedProduct.fields.Name,
                    quantity,
                    newCount: currentCount + quantity
                });
            }
        });

        // Sort products by order count and take top 4
        const favoriteProducts = Array.from(productCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([productId, count]) => {
                const product = productsData.records.find(p => p.id === productId);
                return product ? { ...product, orderCount: count } : null;
            })
            .filter(Boolean);

        console.log('Favorite products:', favoriteProducts);

        // Generate HTML for favorites
        if (favoriteProducts.length === 0) {
            favoritesList.innerHTML = `
                <div class="alert alert-info">
                    <h5>No Favorite Products Yet</h5>
                    <p>Your most ordered products will appear here</p>
                </div>
            `;
            return;
        }

        favoritesList.innerHTML = `
            <div class="product-grid">
                ${favoriteProducts.map(product => createProductCard(product, true)).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading favorites:', error);
        favoritesList.innerHTML = `
            <div class="alert alert-danger">
                <h5>Error Loading Favorites</h5>
                <p>${error.message}</p>
                <button class="btn btn-outline-danger btn-sm mt-2" onclick="loadFavoriteProducts()">
                    <i class="fas fa-sync"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Function to show products page
async function showProducts() {
    console.log('Loading products and favorites...');
    if (!checkAuth()) return;

    try {
        const mainContent = document.getElementById('mainContainer');
        if (!mainContent) {
            throw new Error('Main container not found');
        }

        // Only load favorites initially
        await loadFavoriteProducts();
        
        // Make sure the all products section is hidden initially
        const allProductsSection = document.getElementById('allProductsSection');
        if (allProductsSection) {
            allProductsSection.style.display = 'none';
        }
        
        // Update button text
        const button = document.querySelector('button[onclick="toggleAllProducts()"]');
        if (button) {
            button.innerHTML = '<i class="fas fa-eye"></i> View All Products';
        }
    } catch (error) {
        console.error('Error showing products:', error);
        showError('Failed to load products. Please try again.');
    }
}

// Function to handle navigation
function handleNavClick(page) {
    switch (page) {
        case 'home':
            showProducts();
            break;
        case 'orders':
            showOrders();
            break;
        default:
            console.error('Unknown page:', page);
    }
}

// Function to toggle all products visibility
function toggleAllProducts() {
    const allProductsSection = document.getElementById('allProductsSection');
    const button = document.querySelector('button[onclick="toggleAllProducts()"]');
    
    if (!allProductsSection || !button) {
        console.error('Required elements not found:', {
            section: !!allProductsSection,
            button: !!button
        });
        return;
    }
    
    const isHidden = allProductsSection.style.display === 'none';
    
    if (isHidden) {
        // Show products section
        allProductsSection.style.display = 'block';
        button.innerHTML = '<i class="fas fa-eye-slash"></i> Hide All Products';
        
        // Load products if not already loaded
        if (!allProductsSection.dataset.loaded) {
            loadProducts();
            allProductsSection.dataset.loaded = 'true';
        }
    } else {
        // Hide products section
        allProductsSection.style.display = 'none';
        button.innerHTML = '<i class="fas fa-eye"></i> View All Products';
    }
}

// Initialize dashboard
async function initializeDashboard() {
    console.log('Starting dashboard initialization');
    dumpState('Initial state');
    
    if (!checkAuth()) {
        console.log('Auth check failed during initialization');
        return;
    }
    
    try {
        // Update navbar with username
        const username = localStorage.getItem('username');
        const navbar = document.querySelector('.navbar-nav');
        if (navbar) {
            navbar.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="handleNavClick('home')">Home</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="handleNavClick('orders')">Orders</a>
                </li>
                <li class="nav-item ms-3">
                    <span class="nav-link text-light">Welcome, ${username}</span>
                </li>
            `;
        }

        // Load initial content
        await showProducts();
        
        console.log('Dashboard initialized successfully');
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showError('Failed to initialize dashboard');
    }
}

// Export functions and variables for global use
window.AIRTABLE_URL = AIRTABLE_URL;
window.BASE_ID = BASE_ID;
window.API_KEY = API_KEY;
window.checkAuth = checkAuth;
window.makeAPIRequest = makeAPIRequest;
window.loadFavoriteProducts = loadFavoriteProducts;
window.loadProducts = loadProducts;
window.showProducts = showProducts;
window.handleNavClick = handleNavClick;
window.toggleAllProducts = toggleAllProducts;
window.showError = showError;

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeDashboard);

// Function to remove a product from favorites
async function removeFromFavorites(favoriteId) {
    if (!confirm('Remove this product from favorites?')) return;

    try {
        const response = await fetch(`${window.AIRTABLE_URL}/${window.BASE_ID}/Favorites/${favoriteId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${window.API_KEY}`
            }
        });

        if (!response.ok) throw new Error('Failed to remove from favorites');

        // Refresh the favorites list
        loadFavoriteProducts();
        showAlert('Product removed from favorites', 'success');
    } catch (error) {
        console.error('Error removing from favorites:', error);
        showAlert('Failed to remove from favorites: ' + error.message, 'danger');
    }
}

// Make functions globally accessible
window.removeFromFavorites = removeFromFavorites;
window.showProducts = showProducts;
window.handleNavClick = handleNavClick;
window.toggleAllProducts = toggleAllProducts;
window.showError = showError;

// Function to show orders
function showOrders() {
    console.log('Loading orders...');
    // Implementation of showOrders function
}

// Add this function to help debug authentication issues
function debugAuthState() {
    const state = {
        username: localStorage.getItem('username'),
        customerId: localStorage.getItem('customerId'),
        userRole: localStorage.getItem('userRole'),
        currentPath: window.location.pathname,
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage }
    };
    
    console.log('Auth State:', state);
    return state;
}

// Add this function to help debug paths
function debugPaths() {
    const paths = {
        currentPath: window.location.pathname,
        currentHref: window.location.href,
        baseURI: document.baseURI,
        documentURI: document.documentURI
    };
    console.log('Path Debug:', paths);
    return paths;
}

// Call it during initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initial path state:');
    debugPaths();
    debugAuthState();
});

// Function to load products
async function loadProducts() {
    try {
        const productsContainer = document.getElementById('productsContainer');
        if (!productsContainer) {
            console.error('Products container not found');
            return;
        }

        // Show loading state
        productsContainer.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;

        const data = await makeAPIRequest('Products');
        console.log('Products data:', data);
        
        if (!data.records || data.records.length === 0) {
            productsContainer.innerHTML = `
                <div class="alert alert-info">
                    <h5>No Products Available</h5>
                    <p>Check back later for new products.</p>
                </div>
            `;
            return;
        }

        // Generate HTML for products using the same styling as favorites
        const productsHtml = `
            <div class="product-grid">
                ${data.records.map(product => createProductCard(product)).join('')}
            </div>
        `;

        // Update the container
        productsContainer.innerHTML = productsHtml;
    } catch (error) {
        console.error('Error loading products:', error);
        productsContainer.innerHTML = `
            <div class="alert alert-danger">
                <h5>Error Loading Products</h5>
                <p>${error.message}</p>
                <button class="btn btn-outline-danger btn-sm mt-2" onclick="loadProducts()">
                    <i class="fas fa-sync"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Initialize cart in localStorage if it doesn't exist
function initializeCart() {
    if (!localStorage.getItem('cart')) {
        localStorage.setItem('cart', JSON.stringify([]));
    }
    updateCartDisplay();
}

// Function to add item to cart
function addToCart(productId, productName, price) {
    try {
        // Sanitize inputs
        const sanitizedName = productName.replace(/['"\\]/g, '');
        const validPrice = parseFloat(price) || 0;

        console.log('Adding to cart:', {
            productId,
            productName: sanitizedName,
            price: validPrice
        });

        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Check if product already exists in cart
        const existingItem = cart.find(item => item.productId === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
            console.log('Updated quantity for existing item:', existingItem);
        } else {
            const newItem = {
                productId,
                productName: sanitizedName,
                price: validPrice,
                quantity: 1
            };
            cart.push(newItem);
            console.log('Added new item to cart:', newItem);
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
        
        // Show success message
        showAlert(`Added ${sanitizedName} to cart`, 'success');

        console.log('Current cart:', cart);
    } catch (error) {
        console.error('Error adding to cart:', {
            error,
            productId,
            productName,
            price
        });
        showAlert('Failed to add item to cart', 'danger');
    }
}

// Function to remove item from cart
function removeFromCart(productId) {
    try {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart = cart.filter(item => item.productId !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
    } catch (error) {
        console.error('Error removing from cart:', error);
        showAlert('Failed to remove item from cart', 'danger');
    }
}

// Function to update cart quantity
function updateCartQuantity(productId, newQuantity) {
    try {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const item = cart.find(item => item.productId === productId);
        
        if (item) {
            if (newQuantity <= 0) {
                removeFromCart(productId);
            } else {
                item.quantity = newQuantity;
                localStorage.setItem('cart', JSON.stringify(cart));
                updateCartDisplay();
            }
        }
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        showAlert('Failed to update cart', 'danger');
    }
}

// Function to update cart display
function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!cartItems || !cartTotal || !checkoutBtn) return;
    
    try {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <p class="mb-0">Your cart is empty</p>
                </div>
            `;
            cartTotal.textContent = 'SGD 0.00';
            checkoutBtn.disabled = true;
            return;
        }
        
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="cart-item-name">${item.productName}</div>
                    <button class="btn btn-sm text-danger p-0" 
                            onclick="removeFromCart('${item.productId}')"
                            title="Remove item">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div class="cart-quantity-controls">
                        <button class="btn btn-outline-secondary" type="button" 
                                onclick="updateCartQuantity('${item.productId}', ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="form-control" value="${item.quantity}" 
                               onchange="updateCartQuantity('${item.productId}', parseInt(this.value))"
                               min="1">
                        <button class="btn btn-outline-secondary" type="button"
                                onclick="updateCartQuantity('${item.productId}', ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <span class="cart-item-price">SGD ${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            </div>
        `).join('');
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        cartTotal.textContent = `SGD ${total.toFixed(2)}`;
        checkoutBtn.disabled = false;
    } catch (error) {
        console.error('Error updating cart display:', error);
        showAlert('Failed to update cart display', 'danger');
    }
}

// Function to show alerts
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertDiv.style.zIndex = '1050';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    
    // Remove alert after 3 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Make functions globally accessible
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.showAlert = showAlert;

// Initialize cart when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeCart();
    // ... existing initialization code ...
});

// Function to handle checkout
function checkout() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        showAlert('Your cart is empty', 'warning');
        return;
    }

    // Redirect to order summary page
    window.location.href = 'order-summary.html';
}

// Make checkout function globally accessible
window.checkout = checkout;

// Update the product card template in both loadProducts and loadFavoriteProducts
function createProductCard(product, isFavorite = false) {
    try {
        const { id, fields } = product;
        const { Name, Price, ImageURL } = fields;
        const sanitizedName = Name.replace(/['"\\]/g, '').replace(/\n/g, ' ');
        const validPrice = parseFloat(Price) || 0;

        return `
            <div class="favorite-card">
                ${isFavorite ? `<div class="order-count">Ordered ${product.orderCount} times</div>` : ''}
                <div class="product-image-container">
                    ${ImageURL ? `
                        <img src="${ImageURL}" 
                             alt="${sanitizedName}"
                             class="product-image"
                             onerror="this.onerror=null; this.src='https://via.placeholder.com/200?text=No+Image';">
                    ` : `
                        <div class="no-image">
                            <i class="fas fa-image"></i>
                        </div>
                    `}
                </div>
                <div class="product-details">
                    <h5 class="product-name">${sanitizedName}</h5>
                    <p class="product-price">SGD ${validPrice.toFixed(2)}</p>
                    <button class="btn btn-primary add-to-cart" 
                            onclick="addToCart('${id}', '${sanitizedName}', ${validPrice})">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error creating product card:', error, product);
        return `
            <div class="alert alert-warning">
                Error displaying product
            </div>
        `;
    }
} 