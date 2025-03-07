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
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        mainContainer.insertBefore(alertDiv, mainContainer.firstChild);
    } else {
        console.error('Error:', message);
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
function loadProducts() {
    fetch(`${AIRTABLE_URL}/${BASE_ID}/Products?view=Grid%20view`, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`
        }
    })
    .then(response => response.json())
    .then(data => {
        // Create a new array with all products
        let products = [...data.records];
        
        // Sort products by name
        products.sort((a, b) => {
            // Get the names and convert to uppercase for consistent comparison
            let nameA = (a.fields.Name || '').toUpperCase();
            let nameB = (b.fields.Name || '').toUpperCase();
            
            // Compare the names
            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }
            return 0;
        });

        // Log sorted names to console for verification
        console.log("Sorted Products:", products.map(p => p.fields.Name));

        const productsContainer = document.getElementById('productsContainer');
        if (productsContainer) {
            productsContainer.innerHTML = `
                <div class="row row-cols-1 row-cols-md-3 g-4">
                    ${products.map(product => `
                        <div class="col">
                            <div class="card h-100">
                                <img src="${product.fields.Image?.[0]?.url || 'placeholder.jpg'}" 
                                     class="card-img-top" 
                                     alt="${product.fields.Name}"
                                     style="height: 200px; object-fit: contain;">
                                <div class="card-body">
                                    <h5 class="card-title">${product.fields.Name}</h5>
                                    <p class="card-text">SGD ${product.fields.Price}</p>
                                    <button class="btn btn-primary" 
                                            onclick="addToCart('${product.id}', '${product.fields.Name}', ${product.fields.Price})">
                                        Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        const productsContainer = document.getElementById('productsContainer');
        if (productsContainer) {
            productsContainer.innerHTML = '<div class="alert alert-danger">Error loading products</div>';
        }
    });
}

// Cart functionality
function initializeCart() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    updateCartDisplay();
    console.log('Cart initialized:', cart);
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        cartTotal.textContent = 'SGD 0.00';
        checkoutBtn.disabled = true;
        return;
    }
    
    let total = 0;
    cartItems.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        return `
            <div class="cart-item">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.productName}</div>
                    <div class="cart-item-price">SGD ${item.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button onclick="updateQuantity('${item.productId}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
                </div>
            </div>
        `;
    }).join('');
    
    cartTotal.textContent = `SGD ${total.toFixed(2)}`;
    checkoutBtn.disabled = false;
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

// Add this at the bottom of dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    // Find checkout button
    const checkoutBtn = document.querySelector('.checkout-btn'); // Update this selector to match your button's class
    if (checkoutBtn) {
        console.log('Checkout button found');
        checkoutBtn.addEventListener('click', function() {
            console.log('Checkout button clicked');
            proceedToCheckout();
        });
    } else {
        console.error('Checkout button not found');
    }
});

// Add this function to check trade deals
async function checkTradeDeals(cart) {
    console.log('Checking trade deals for cart:', cart);
    
    try {
        const response = await fetch(`${AIRTABLE_URL}/${BASE_ID}/TradeDeal`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch trade deals');
        const data = await response.json();
        console.log('Trade deals:', data.records);

        let cartUpdated = false;

        for (let item of cart) {
            console.log('Checking item:', item);
            
            // Find matching trade deal
            const matchingDeal = data.records.find(deal => 
                item.name.toLowerCase().includes(deal.fields.Name.toLowerCase())
            );

            if (matchingDeal) {
                console.log('Found matching deal:', matchingDeal.fields);
                const requiredQty = matchingDeal.fields.QuantityReq;
                const focQty = matchingDeal.fields.FOC;
                const currentQty = item.quantity || 1;

                if (currentQty < requiredQty) {
                    const additionalQtyNeeded = requiredQty - currentQty;
                    const wantsDeal = confirm(`
                        Trade Deal Available!
                        
                        Product: ${item.name}
                        Current Quantity: ${currentQty}
                        Buy ${requiredQty} get ${focQty} FREE!
                        
                        Add ${additionalQtyNeeded} more to qualify for this deal!
                        
                        Would you like to update your quantity?
                    `);
                    
                    if (wantsDeal) {
                        item.quantity = requiredQty;
                        item.focQuantity = focQty;
                        cartUpdated = true;
                    }
                } else {
                    item.focQuantity = focQty;
                }
            }
        }

        if (cartUpdated) {
            localStorage.setItem('cart', JSON.stringify(cart));
        }
        
        return cart;
    } catch (error) {
        console.error('Error checking trade deals:', error);
        return cart;
    }
}

// Update the proceedToCheckout function
async function proceedToCheckout() {
    console.log('Starting checkout process');
    
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Check for trade deals before proceeding
    console.log('Checking trade deals before checkout');
    await checkTradeDeals(cart);

    // Display order summary
    displayOrderSummary(cart);
}

// Add function to display order summary
function displayOrderSummary(cart) {
    let total = 0;
    const summaryHtml = `
        <div class="container mt-5">
            <h2>Order Summary</h2>
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cart.map(item => {
                                    const itemTotal = item.price * item.quantity;
                                    total += itemTotal;
                                    return `
                                        <tr>
                                            <td>${item.name}</td>
                                            <td>
                                                ${item.quantity}
                                                ${item.focQuantity ? 
                                                    `<span class="text-success">+ ${item.focQuantity} FREE!</span>` 
                                                    : ''}
                                            </td>
                                            <td>SGD ${item.price.toFixed(2)}</td>
                                            <td>SGD ${itemTotal.toFixed(2)}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="text-end"><strong>Total:</strong></td>
                                    <td><strong>SGD ${total.toFixed(2)}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-3">
                        <button class="btn btn-secondary me-md-2" onclick="window.history.back()">Back</button>
                        <button class="btn btn-primary" onclick="confirmOrder()">Confirm Order</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = summaryHtml;
    }
}

// Add function to confirm order
function confirmOrder() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        alert('No items in cart!');
        return;
    }

    // Here you would typically send the order to your backend
    alert('Order confirmed! Thank you for your purchase.');
    
    // Clear the cart
    localStorage.removeItem('cart');
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
}

// Update the product card template in both loadProducts and loadFavoriteProducts
function createProductCard(product, isFavorite = false) {
    try {
        const { id, fields } = product;
        const { Name, Price, ImageURL } = fields;
        const sanitizedName = Name.replace(/['"\\]/g, '').replace(/\n/g, ' ');
        const validPrice = parseFloat(Price) || 0;

        return `
            <div class="favorite-card">
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

// Export functions
window.initializeCart = initializeCart;
window.updateCartDisplay = updateCartDisplay;
window.showError = showError;

async function checkTradeDeals(cart) {
    console.log('checkTradeDeals started');
    
    try {
        // Fetch trade deals
        const response = await fetch(`${AIRTABLE_URL}/${BASE_ID}/TradeDeal`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Trade deals fetched:', data.records);

        // Process each cart item
        for (let item of cart) {
            console.log('Checking item:', item.productName);
            
            // Find matching deals
            const matchingDeals = data.records.filter(deal => {
                const dealName = deal.fields.Name.toLowerCase();
                const productName = item.productName.toLowerCase();
                const isMatch = productName.includes(dealName);
                console.log(`Comparing: ${dealName} with ${productName}. Match: ${isMatch}`);
                return isMatch;
            });

            console.log('Matching deals found:', matchingDeals);

            for (const deal of matchingDeals) {
                const requiredQty = deal.fields.QuantityReq;
                const focQty = deal.fields.FOC;
                
                console.log(`Deal details - Required: ${requiredQty}, Current: ${item.quantity}, FOC: ${focQty}`);

                if (item.quantity < requiredQty) {
                    const additionalQtyNeeded = requiredQty - item.quantity;
                    
                    const wantsDeal = confirm(`
                        Trade Deal Available!
                        
                        Product: ${item.productName}
                        Current Quantity: ${item.quantity}
                        Deal: Buy ${requiredQty} get ${focQty} FREE
                        
                        Add ${additionalQtyNeeded} more to qualify for this deal!
                        
                        Would you like to update your quantity to qualify?
                    `);

                    if (wantsDeal) {
                        item.quantity = requiredQty;
                        alert(`Great! Your quantity has been updated to ${requiredQty}. You'll receive ${focQty} free items!`);
                    }
                } else if (item.quantity >= requiredQty) {
                    alert(`
                        Congratulations! 
                        Your order of ${item.quantity} ${item.productName} qualifies for a trade deal.
                        You will receive ${focQty} items FREE with your purchase!
                    `);
                }
            }
        }
        
        return cart;
    } catch (error) {
        console.error('Error in checkTradeDeals:', error);
        alert('Error checking trade deals. Please try again.');
        return cart;
    }
}

// Update the existing displayOrderSummary function
async function displayOrderSummary() {
    console.log('Display Order Summary Started');
    
    try {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        console.log('Current cart:', cart);

        if (cart.length === 0) {
            document.getElementById('mainContainer').innerHTML = `
                <div class="container mt-5">
                    <div class="alert alert-info">Your cart is empty</div>
                </div>
            `;
            return;
        }

        // Check trade deals before displaying summary
        console.log('Checking trade deals...');
        cart = await checkTradeDeals(cart);
        console.log('Cart after trade deals check:', cart);

        // Calculate total
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const summaryHtml = `
            <div class="container mt-5">
                <h2>Order Summary</h2>
                <div class="card">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Quantity</th>
                                        <th>Price</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${cart.map(item => `
                                        <tr>
                                            <td>${item.productName}</td>
                                            <td>${item.quantity}</td>
                                            <td>SGD ${item.price.toFixed(2)}</td>
                                            <td>SGD ${(item.price * item.quantity).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="3" class="text-end"><strong>Total:</strong></td>
                                        <td><strong>SGD ${total.toFixed(2)}</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-3">
                            <button class="btn btn-secondary me-md-2" onclick="window.history.back()">Back</button>
                            <button class="btn btn-primary" onclick="proceedToCheckout()">Proceed to Checkout</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const mainContainer = document.getElementById('mainContainer');
        if (!mainContainer) {
            throw new Error('Main container not found');
        }
        mainContainer.innerHTML = summaryHtml;
        
    } catch (error) {
        console.error('Error in displayOrderSummary:', error);
        showError('Failed to load order summary. Please try again.');
    }
}

// Make sure this function is called when the page loads
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('order-summary.html')) {
        displayOrderSummary();
    }
});

// Update the loadChatbot function
function loadChatbot() {
    const chatbotContainer = document.getElementById('chatbotContainer');
    if (chatbotContainer) {
        chatbotContainer.innerHTML = `
            <iframe 
                src="https://app.relevanceai.com/agents/f1db6c/f099903e0711-4d99-8a1c-6c65b95a8189/772c3d36-ddc1-4f56-8383-4e023aedf1ef/embed-chat?hide_tool_steps=false&hide_file_uploads=false&hide_conversation_list=false&bubble_style=agent&primary_color=%23685FFF&bubble_icon=pd%2Fchat&input_placeholder_text=Type+your+message...&hide_logo=false" 
                width="100%" 
                height="100%" 
                frameborder="0">
            </iframe>
        `;
    } else {
        console.error('Chatbot container not found');
    }
}

// Make sure the chatbot loads when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadChatbot();
}); 