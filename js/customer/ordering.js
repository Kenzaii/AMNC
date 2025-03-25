// Check authorization
document.addEventListener('DOMContentLoaded', function() {
    // Allow both user and guest roles
    if (!checkAuth(['user', 'guest'])) return;
    
    // Display current user
    const user = getCurrentUser();
    document.getElementById('current-user').textContent = user.name || user.username;
    
    // Initialize cart
    initializeCart();
    
    // Load categories and products
    loadCategories()
        .then(() => loadProducts());
    
    // Setup event listeners
    setupEventListeners();
});

// Global variables
let products = [];
let favoriteProducts = []; // Added for favorite products
let cart = [];
const TAX_RATE = 0.09; // 9% tax
let currentPage = 1;
const itemsPerPage = 8;
let currentFilters = {
    search: ''
};
let selectedProduct = null;
let currentUserBPCode = ''; // Store the current user's BP code
let showFavoritesOnly = false; // Track if we're showing favorites only

// Initialize cart from localStorage
function initializeCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartDisplay();
    }
}

// Load user's favorite products based on order history
function loadFavoriteProducts() {
    const user = getCurrentUser();
    const userId = user.bpCode || user.id;
    const isGuest = localStorage.getItem('userRole') === 'Guest';
    
    console.log("Loading favorite products for user:", user);
    console.log("User ID for favorites:", userId);
    
    // Create a default mock favorite if no favorites are found
    function createDefaultFavorites() {
        console.log("No favorites found, adding first two products as samples if available");
        if (products && products.length > 0) {
            // Use first two products (or one if only one exists)
            const sampleFavorites = products.slice(0, Math.min(2, products.length)).map(p => p.id);
            favoriteProducts = sampleFavorites;
            console.log("Created sample favorites:", favoriteProducts);
            return Promise.resolve(sampleFavorites);
        }
        return Promise.resolve([]);
    }
    
    if (isGuest) {
        // For guests, use name or email
        const filter = encodeURIComponent(`OR({CustomerName}="${user.name}", {CustomerEmail}="${user.email || ''}")`);
        console.log("Guest user filter:", filter);
        return fetchOrderHistory(filter)
            .then(favorites => {
                if (!favorites || favorites.length === 0) {
                    return createDefaultFavorites();
                }
                return favorites;
            });
    } else if (userId) {
        // For registered users, use BP code
        const filter = encodeURIComponent(`{BPCode}="${userId}"`);
        console.log("Registered user filter:", filter);
        return fetchOrderHistory(filter)
            .then(favorites => {
                if (!favorites || favorites.length === 0) {
                    return createDefaultFavorites();
                }
                return favorites;
            });
    } else {
        console.log("No user ID found");
        return createDefaultFavorites();
    }
    
    function fetchOrderHistory(filter) {
        return fetch(`${API_URL}/Orders?filterByFormula=${filter}`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log("User order history:", data.records);
            if (!data.records || data.records.length === 0) {
                console.log("No orders found for user");
                return [];
            }
            
            // Get all order IDs
            const orderIds = data.records.map(order => order.id);
            
            // Fetch order items for these orders
            const orderItemPromises = orderIds.map(orderId => {
                // We need to use the id here, not a field called OrderID
                const filter = encodeURIComponent(`{OrderID}="${orderId}"`);
                return fetch(`${API_URL}/OrderItems?filterByFormula=${filter}`, {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json());
            });
            
            return Promise.all(orderItemPromises)
                .then(results => {
                    // Flatten all order items
                    const allOrderItems = results.flatMap(result => result.records || []);
                    console.log("User's order items:", allOrderItems);
                    
                    // Count product frequency
                    const productCounts = {};
                    allOrderItems.forEach(item => {
                        const productId = item.fields.ProductID;
                        if (productId) {
                            productCounts[productId] = (productCounts[productId] || 0) + 1;
                        }
                    });
                    
                    // Sort products by frequency
                    const sortedProductIds = Object.keys(productCounts).sort((a, b) => 
                        productCounts[b] - productCounts[a]
                    );
                    
                    console.log("User's favorite product IDs:", sortedProductIds);
                    
                    // Store favorite product IDs
                    favoriteProducts = sortedProductIds;
                    
                    // Refresh the products display if products are already loaded
                    if (products.length > 0) {
                        applyFiltersAndDisplay();
                    }
                    
                    return sortedProductIds;
                });
        })
        .catch(error => {
            console.error("Error loading favorite products:", error);
            return [];
        });
    }
}

// Check if a product is a favorite
function isFavoriteProduct(productId) {
    if (!favoriteProducts || !Array.isArray(favoriteProducts) || favoriteProducts.length === 0) {
        return false;
    }
    
    // Convert the product ID to a string for comparison
    const productIdStr = String(productId).trim();
    
    // For debugging
    const result = favoriteProducts.some(favId => String(favId).trim() === productIdStr);
    if (result) {
        console.log(`Product ${productId} is a favorite`);
    }
    
    // Check if the product ID exists in the favoriteProducts array
    return result;
}

// Load product categories
function loadCategories() {
    // We're no longer loading categories, but keep this function to load favorites
    return Promise.resolve()
        .then(() => loadFavoriteProducts()); // Load favorites after categories
}

// Load products from AirTable
function loadProducts() {
    // Get current user's BP code for special pricing
    const user = getCurrentUser();
    currentUserBPCode = user.bpCode || user.id || '';
    
    console.log("Current user:", user);
    console.log("Current user BP code:", currentUserBPCode);
    
    // If we're unable to get a BPCode, try to directly request it from AirTable
    if (!currentUserBPCode && user.username) {
        console.log("No BPCode found, trying to fetch user data from AirTable");
        fetch(`${API_URL}/Users?filterByFormula={Username}="${user.username}"`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(userData => {
            if (userData.records && userData.records.length > 0) {
                currentUserBPCode = userData.records[0].fields.BPCode || userData.records[0].id;
                console.log("Found user BPCode from AirTable:", currentUserBPCode);
                // Now load products with the correct BPCode
                fetchProducts();
            } else {
                console.log("User not found in AirTable, proceeding with no BPCode");
                fetchProducts();
            }
        })
        .catch(error => {
            console.error("Error fetching user data:", error);
            fetchProducts();
        });
    } else {
        fetchProducts();
    }
    
    function fetchProducts() {
        // Debug log to verify BPCode before fetching products
        console.log("Fetching products with BPCode:", currentUserBPCode);
        
        fetch(`${API_URL}/Products`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log("Products data received, records count:", data.records ? data.records.length : 0);
            
            products = data.records.map(record => {
                // Process product data (keeping existing code)
                // ... [existing product processing code]
                
                // Check if this product has special pricing for this customer
                const regularPrice = parseFloat(record.fields.Price) || 0;
                let price = regularPrice;
                let hasSpecialPrice = false;
                
                // Debug record details
                console.log(`\nProduct: ${record.fields.Name} (ID: ${record.id})`);
                
                // Special price detection - simplified and more robust
                if (record.fields.SpecialPrice != null && record.fields.SpecialPrice !== "") {
                    const specialPrice = parseFloat(record.fields.SpecialPrice);
                    
                    if (isNaN(specialPrice)) {
                        console.log(`Invalid special price format: ${record.fields.SpecialPrice}`);
                    } else {
                        // Check for any valid special price condition
                        let isSpecialPriceApplicable = false;
                        
                        // Debug to show clear information
                        console.log(`Special Price Check for ${record.fields.Name}:`);
                        console.log(`- Current User BP Code: [${currentUserBPCode}]`);
                        console.log(`- Product Customer ID: [${record.fields.CustomerID || 'none'}]`);
                        console.log(`- Regular Price: ${regularPrice}, Special Price: ${specialPrice}`);
                        
                        // Condition 1: Direct customer match in CustomerID field
                        if (record.fields.CustomerID) {
                            // Normalize strings for comparison - trim whitespace and convert to lowercase
                            const customerIdMatches = String(record.fields.CustomerID).trim().toLowerCase() === 
                                                     String(currentUserBPCode).trim().toLowerCase();
                            console.log(`- Direct customer match in CustomerID? ${customerIdMatches} [${record.fields.CustomerID}]`);
                            
                            if (customerIdMatches) {
                                isSpecialPriceApplicable = true;
                                console.log(`  ✓ Special price applied: direct customer match in CustomerID`);
                            }
                        }
                        
                        // Condition 2: Direct customer match in BPCode field (if exists)
                        if (!isSpecialPriceApplicable && record.fields.BPCode) {
                            const bpCodeMatches = String(record.fields.BPCode).trim().toLowerCase() === 
                                                 String(currentUserBPCode).trim().toLowerCase();
                            console.log(`- Direct customer match in BPCode? ${bpCodeMatches} [${record.fields.BPCode}]`);
                            
                            if (bpCodeMatches) {
                                isSpecialPriceApplicable = true;
                                console.log(`  ✓ Special price applied: direct customer match in BPCode field`);
                            }
                        }
                        
                        // Condition 3: Customer in assigned list
                        if (!isSpecialPriceApplicable && record.fields.AssignedCustomerIDs && 
                            Array.isArray(record.fields.AssignedCustomerIDs) && 
                            record.fields.AssignedCustomerIDs.length > 0) {
                            
                            const customerBpCodeStr = String(currentUserBPCode).trim().toLowerCase();
                            const assignedIds = record.fields.AssignedCustomerIDs.map(id => String(id).trim().toLowerCase());
                            
                            console.log(`- Assigned customer IDs: [${assignedIds.join(', ')}]`);
                            console.log(`- Customer in assigned list? ${assignedIds.includes(customerBpCodeStr)}`);
                            
                            if (assignedIds.includes(customerBpCodeStr)) {
                                isSpecialPriceApplicable = true;
                                console.log(`  ✓ Special price applied: customer in assigned list`);
                            }
                        }
                        
                        // Apply special price if applicable
                        if (isSpecialPriceApplicable) {
                            hasSpecialPrice = true;
                            price = specialPrice;
                            console.log(`  → Final price: ${price} (special) instead of ${regularPrice} (regular)`);
                            
                            // Make sure we're setting a real discount
                            if (specialPrice >= regularPrice) {
                                console.log(`  ⚠️ Special price (${specialPrice}) is not lower than regular price (${regularPrice}), but marking as special anyway`);
                            }
                        } else {
                            console.log(`  → No special price applied, using regular price: ${regularPrice}`);
                        }
                    }
                }
                
                // Create product object with all needed properties
                return {
                    id: record.id,
                    ...record.fields,
                    Price: price,
                    RegularPrice: regularPrice,
                    Status: record.fields.Status || 'active',
                    hasSpecialPrice: hasSpecialPrice
                };
            });
            
            console.log("Total products before filtering:", products.length);
            
            // Filter products based on customer assignment
            products = products.filter(product => {
                // Check if product is active
                const isActive = !product.Status || product.Status === 'active';
                
                // Debug product filtering
                console.log(`Filtering product ${product.Name} (ID: ${product.id})`);
                console.log(`- Current user BPCode: ${currentUserBPCode}`);
                
                // 1. Check if this is a global product (for all customers)
                const isForAllCustomers = !product.CustomerID && 
                                        !product.BPCode && 
                                        (!product.AssignedCustomerIDs || product.AssignedCustomerIDs.length === 0);
                
                // 2. Check all possible fields where BPCode might be stored
                // Look in CustomerID field
                let hasCustomerIDMatch = false;
                if (product.CustomerID) {
                    hasCustomerIDMatch = String(product.CustomerID).trim().toLowerCase() === String(currentUserBPCode).trim().toLowerCase();
                    console.log(`- CustomerID field match? ${hasCustomerIDMatch} [${product.CustomerID}]`);
                }
                
                // Look in BPCode field (if exists)
                let hasBPCodeMatch = false;
                if (product.BPCode) {
                    hasBPCodeMatch = String(product.BPCode).trim().toLowerCase() === String(currentUserBPCode).trim().toLowerCase();
                    console.log(`- BPCode field match? ${hasBPCodeMatch} [${product.BPCode}]`);
                }
                
                // Look in AssignedCustomerIDs array
                let isInAssignedList = false;
                if (product.AssignedCustomerIDs && Array.isArray(product.AssignedCustomerIDs) && product.AssignedCustomerIDs.length > 0) {
                    const customerBpCodeStr = String(currentUserBPCode).trim().toLowerCase();
                    const assignedIds = product.AssignedCustomerIDs.map(id => String(id).trim().toLowerCase());
                    isInAssignedList = assignedIds.includes(customerBpCodeStr);
                    console.log(`- In AssignedCustomerIDs? ${isInAssignedList} [${product.AssignedCustomerIDs.join(', ')}]`);
                }
                
                // Check if product has special pricing for this customer
                const hasCustomerSpecialPrice = product.hasSpecialPrice;
                console.log(`- Has special price? ${hasCustomerSpecialPrice}`);
                
                // Product is available to this customer if:
                // 1. It's active AND
                // 2. Either it's for all customers OR 
                //    it's assigned to this customer OR 
                //    it has special pricing for this customer
                const isAvailableToCustomer = isActive && 
                    (isForAllCustomers || 
                     hasCustomerIDMatch || 
                     hasBPCodeMatch || 
                     isInAssignedList || 
                     hasCustomerSpecialPrice);
                
                console.log(`- Available to this customer? ${isAvailableToCustomer}`);
                return isAvailableToCustomer;
            });
            
            console.log("Products after filtering:", products.length);
            
            // Check if we need to create default favorites if none exist
            if (!favoriteProducts || favoriteProducts.length === 0) {
                console.log("No favorites found after product load, creating defaults");
                // Get the first two products as favorites
                const sampleFavorites = products.slice(0, Math.min(2, products.length)).map(p => p.id);
                favoriteProducts = sampleFavorites;
                console.log("Created default favorites:", favoriteProducts);
            }
            
            console.log("Current favorites before display:", favoriteProducts);
            
            // Apply filters and display products
            applyFiltersAndDisplay();
        })
        .catch(error => {
            console.error('Error loading products:', error);
            showNotification('Failed to load products', 'error');
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search filter
    const searchInput = document.getElementById('search-product');
    
    searchInput.addEventListener('input', function() {
        currentFilters.search = this.value;
        currentPage = 1;
        applyFiltersAndDisplay();
    });
    
    // Product modal
    const productModal = document.getElementById('product-modal');
    const closeModal = productModal.querySelector('.close');
    const decreaseBtn = document.getElementById('decrease-quantity');
    const increaseBtn = document.getElementById('increase-quantity');
    const quantityInput = document.getElementById('modal-quantity');
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    
    closeModal.addEventListener('click', function() {
        productModal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === productModal) {
            productModal.style.display = 'none';
        }
    });
    
    decreaseBtn.addEventListener('click', function() {
        let value = parseInt(quantityInput.value);
        if (value > 1) {
            quantityInput.value = value - 1;
        }
    });
    
    increaseBtn.addEventListener('click', function() {
        let value = parseInt(quantityInput.value);
        const maxStock = selectedProduct ? selectedProduct.Stock : 0;
        if (value < maxStock) {
            quantityInput.value = value + 1;
        }
    });
    
    quantityInput.addEventListener('change', function() {
        let value = parseInt(this.value);
        const maxStock = selectedProduct ? selectedProduct.Stock : 0;
        
        if (isNaN(value) || value < 1) {
            this.value = 1;
        } else if (value > maxStock) {
            this.value = maxStock;
        }
    });
    
    addToCartBtn.addEventListener('click', function() {
        if (!selectedProduct) return;
        
        const quantity = parseInt(quantityInput.value);
        addToCart(selectedProduct.id, quantity);
        productModal.style.display = 'none';
    });
    
    // Checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    checkoutBtn.addEventListener('click', function() {
        prepareCheckout();
    });
    
    // Setup checkout form events
    setupCheckoutEvents();
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

// Display products in the grid with favorites section
function displayProducts(productsToDisplay) {
    console.log("Running displayProducts with", productsToDisplay.length, "products");
    console.log("Current favorites:", favoriteProducts);
    
    const container = document.getElementById('products-container');
    container.innerHTML = '';
    
    if (productsToDisplay.length === 0) {
        container.innerHTML = '<div class="no-products">No products found</div>';
        return;
    }
    
    // Detect favorite products in current display list
    const favProducts = productsToDisplay.filter(p => isFavoriteProduct(p.id));
    console.log("Found favorite products:", favProducts.length, favProducts.map(p => p.Name));
    
    // Always show favorites toggle if we have any favorites at all
    const favToggleSection = document.createElement('div');
    favToggleSection.className = 'favorites-toggle';
    
    // Show toggle even if no favorites in current view
    const hasFavorites = favoriteProducts.length > 0;
    console.log("Has favorites:", hasFavorites, "Count:", favoriteProducts.length);
    
    // Only show toggle if user has favorites
    if (hasFavorites) {
        favToggleSection.innerHTML = `
            <div class="toggle-buttons">
                <button id="show-all" class="btn ${!showFavoritesOnly ? 'btn-primary' : ''}">
                    <i class="icon">☰</i> All Products
                </button>
                <button id="show-favorites" class="btn ${showFavoritesOnly ? 'btn-primary' : ''}">
                    <i class="icon">★</i> Favorites
                </button>
            </div>
        `;
        container.appendChild(favToggleSection);
        
        // Add event listener for the favorites toggle buttons
        document.getElementById('show-all').addEventListener('click', function() {
            if (showFavoritesOnly) {
                showFavoritesOnly = false;
                applyFiltersAndDisplay();
            }
        });
        
        document.getElementById('show-favorites').addEventListener('click', function() {
            if (!showFavoritesOnly) {
                showFavoritesOnly = true;
                applyFiltersAndDisplay();
            }
        });
    }
    
    // If we have favorites and not in favorites-only mode, show a favorites section
    if (favProducts.length > 0 && !showFavoritesOnly) {
        console.log("Creating favorites section with", favProducts.length, "products");
        
        // Create favorites section
        const favoritesSection = document.createElement('div');
        favoritesSection.className = 'favorites-section';
        favoritesSection.innerHTML = '<h3>Your Favorites</h3>';
        
        // Create grid for favorite products
        const favGrid = document.createElement('div');
        favGrid.className = 'products-grid';
        
        // Add favorite products to grid
        favProducts.forEach(product => {
            console.log("Adding favorite product to grid:", product.Name);
            const card = createProductCard(product);
            favGrid.appendChild(card);
        });
        
        favoritesSection.appendChild(favGrid);
        container.appendChild(favoritesSection);
        
        // Only add divider and all products header if we have non-favorite products to show
        const nonFavProducts = productsToDisplay.filter(p => !isFavoriteProduct(p.id));
        if (nonFavProducts.length > 0) {
            // Add divider
            const divider = document.createElement('div');
            divider.className = 'section-divider';
            container.appendChild(divider);
            
            // Add all products section header
            const allProductsHeader = document.createElement('h3');
            allProductsHeader.textContent = 'All Products';
            allProductsHeader.className = 'section-header';
            container.appendChild(allProductsHeader);
        }
    }
    
    // If in favorites-only mode, show a header
    if (showFavoritesOnly) {
        const favoritesHeader = document.createElement('h3');
        favoritesHeader.textContent = 'Your Favorites';
        favoritesHeader.className = 'section-header';
        container.appendChild(favoritesHeader);
    }
    
    // Create main products grid
    const productsGrid = document.createElement('div');
    productsGrid.className = 'products-grid';
    
    // Filter products if we're in favorites-only mode
    let displayList;
    if (showFavoritesOnly) {
        displayList = productsToDisplay.filter(p => isFavoriteProduct(p.id));
    } else if (favProducts.length > 0) {
        // If we're showing favorites section, don't duplicate favorite products in main grid
        displayList = productsToDisplay.filter(p => !isFavoriteProduct(p.id));
    } else {
        // Otherwise show all products
        displayList = productsToDisplay;
    }
    
    // Add products to the main grid
    displayList.forEach(product => {
        const card = createProductCard(product);
        productsGrid.appendChild(card);
    });
    
    container.appendChild(productsGrid);
}

// Helper function to create a product card
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-id', product.id);
    
    // Check if product is a favorite
    const isFav = isFavoriteProduct(product.id);
    
    if (isFav) {
        card.classList.add('favorite-product');
    }
    
    // Default image if none is provided
    const imageUrl = product.ImageURL || '../images/no-image.svg';
    
    // Format price display based on whether there's a special price
    let priceDisplay = '';
    
    // Calculate discount if special price
    let specialPriceTag = '';
    let favoriteTag = '';
    let discountText = '';

    // Add favorite tag if applicable
    if (isFav) {
        favoriteTag = '<span class="favorite-tag">★ Favorite</span>';
    }

    // Debug special price details
    console.log(`Creating card for ${product.Name}:`, {
        id: product.id,
        hasSpecialPrice: product.hasSpecialPrice,
        regularPrice: product.RegularPrice,
        currentPrice: product.Price,
        customerID: product.CustomerID,
        BPCode: product.BPCode,
        currentUserBPCode: currentUserBPCode
    });

    // Add special price display if applicable
    if (product.hasSpecialPrice) {
        // Add special price tag
        specialPriceTag = '<span class="special-price-tag">SPECIAL</span>';
        
        // Calculate discount percentage
        if (!isNaN(product.RegularPrice) && !isNaN(product.Price) && product.RegularPrice > 0) {
            const discountPercent = Math.round((1 - product.Price / product.RegularPrice) * 100);
            if (discountPercent > 0) {
                discountText = `<span class="discount-percent">Save ${discountPercent}%</span>`;
            }
        }
        
        // Enhanced special price display with clear visual distinction
        priceDisplay = `
            <div class="product-price has-special-price">
                <div class="price-content">
                    <span class="original-price">${formatCurrency(product.RegularPrice)}</span>
                    <span class="discounted-price">${formatCurrency(product.Price)}</span>
                    ${discountText}
                </div>
                <div class="special-price-indicator">Special Price For You!</div>
            </div>`;
    } else {
        // Regular price display
        priceDisplay = `<div class="product-price">${formatCurrency(product.Price)}</div>`;
    }
    
    // Handle description
    const description = product.Description || product.Descriptions || '';
    const descriptionHtml = description ? `<div class="product-description">${truncateText(description, 60)}</div>` : '';
    
    // Build the card HTML
    card.innerHTML = `
        <div class="product-image">
            <img src="${imageUrl}" alt="${product.Name}" onerror="this.src='../images/no-image.svg'">
            ${specialPriceTag}
            ${favoriteTag}
        </div>
        <div class="product-details">
            <div class="product-name">${product.Name}</div>
            ${priceDisplay}
            ${descriptionHtml}
            <button class="add-to-cart-btn" data-id="${product.id}">Add to Cart</button>
        </div>
    `;
    
    // Add event listeners
    card.querySelector('.product-image').addEventListener('click', function() {
        viewProductDetails(product.id);
    });
    
    card.querySelector('.product-name').addEventListener('click', function() {
        viewProductDetails(product.id);
    });
    
    card.querySelector('.add-to-cart-btn').addEventListener('click', function(e) {
        e.stopPropagation();
        const quantity = 1; // Default quantity
        addToCart(this.getAttribute('data-id'), quantity);
    });
    
    return card;
}

// Helper function to truncate text
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
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

// View product details
function viewProductDetails(productId) {
    selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;
    
    console.log("Viewing product details:", {
        name: selectedProduct.Name,
        hasSpecialPrice: selectedProduct.hasSpecialPrice,
        regularPrice: selectedProduct.RegularPrice,
        price: selectedProduct.Price
    });
    
    const modal = document.getElementById('product-modal');
    
    // Create fresh content
    const modalContent = modal.querySelector('.modal-content');
    
    // Check if this is actually a discounted special price
    const hasDiscount = selectedProduct.hasSpecialPrice;
    
    // Calculate discount percentage if special price
    let discountText = '';
    if (hasDiscount && 
        !isNaN(selectedProduct.RegularPrice) && 
        !isNaN(selectedProduct.Price) && 
        selectedProduct.RegularPrice > 0) {
        
        const discountPercent = Math.round((1 - selectedProduct.Price / selectedProduct.RegularPrice) * 100);
        if (discountPercent > 0) {
            discountText = `<span class="discount-percent">Save ${discountPercent}%</span>`;
        }
    }
    
    modalContent.innerHTML = `
        <span class="close">&times;</span>
        <div class="product-details">
            <div class="product-image">
                <img src="${selectedProduct.ImageURL || '../images/no-image.svg'}" 
                     alt="${selectedProduct.Name}" 
                     onerror="this.src='../images/no-image.svg'">
                ${hasDiscount ? '<span class="special-price-tag">SPECIAL</span>' : ''}
                ${isFavoriteProduct(selectedProduct.id) ? '<span class="favorite-tag">★ Favorite</span>' : ''}
            </div>
            <div class="product-info">
                <h2>${selectedProduct.Name}</h2>
                ${selectedProduct.hasSpecialPrice ? 
                    `<div class="product-price has-special-price">
                        <div class="price-content">
                            <span class="original-price">${formatCurrency(selectedProduct.RegularPrice)}</span>
                            <span class="discounted-price">${formatCurrency(selectedProduct.Price)}</span>
                            ${discountText}
                        </div>
                        <div class="special-price-indicator">Special Price For You!</div>
                    </div>` : 
                    `<div class="product-price">${formatCurrency(selectedProduct.Price)}</div>`
                }
                <div class="product-description">
                    ${selectedProduct.Description || selectedProduct.Descriptions || 'No description available'}
                </div>
                <div class="product-stock">
                    <strong>In Stock:</strong> 
                    <span>${selectedProduct.Stock ? `${selectedProduct.Stock} units` : 'In Stock'}</span>
                </div>
                <div class="product-quantity">
                    <label for="modal-quantity">Quantity:</label>
                    <div class="quantity-control">
                        <button id="decrease-quantity">-</button>
                        <input type="number" id="modal-quantity" min="1" value="1">
                        <button id="increase-quantity">+</button>
                    </div>
                </div>
                <button id="add-to-cart-btn" class="btn btn-primary">Add to Cart</button>
            </div>
        </div>
    `;
    
    // Setup event listeners
    modalContent.querySelector('.close').addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    const decreaseBtn = modalContent.querySelector('#decrease-quantity');
    const increaseBtn = modalContent.querySelector('#increase-quantity');
    const quantityInput = modalContent.querySelector('#modal-quantity');
    const addToCartBtn = modalContent.querySelector('#add-to-cart-btn');
    
    decreaseBtn.addEventListener('click', function() {
        let value = parseInt(quantityInput.value);
        if (value > 1) {
            quantityInput.value = value - 1;
        }
    });
    
    increaseBtn.addEventListener('click', function() {
        let value = parseInt(quantityInput.value);
        const maxStock = selectedProduct.Stock || 999;
        if (value < maxStock) {
            quantityInput.value = value + 1;
        }
    });
    
    quantityInput.addEventListener('change', function() {
        let value = parseInt(this.value);
        const maxStock = selectedProduct.Stock || 999;
        
        if (isNaN(value) || value < 1) {
            this.value = 1;
        } else if (value > maxStock) {
            this.value = maxStock;
        }
    });
    
    addToCartBtn.addEventListener('click', function() {
        const quantity = parseInt(quantityInput.value);
        addToCart(selectedProduct.id, quantity);
        modal.style.display = 'none';
    });
    
    // Show modal
    modal.style.display = 'block';
}

// Add product to cart
function addToCart(productId, quantity) {
    // Find the product
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error("Product not found:", productId);
        return;
    }
    
    console.log("Adding to cart:", product);
    console.log("Product has special price?", product.hasSpecialPrice);
    console.log("Regular price:", product.RegularPrice);
    console.log("Current price:", product.Price);
    
    // Check if product is already in cart
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        // Update quantity
        existingItem.quantity += parseInt(quantity);
        console.log("Updated existing cart item:", existingItem);
    } else {
        // Add new item
        const newItem = {
            id: productId,
            name: product.Name,
            price: product.Price,
            regularPrice: product.RegularPrice || product.Price,
            hasSpecialPrice: product.hasSpecialPrice,
            unit: product.Unit || 'unit',
            quantity: parseInt(quantity)
        };
        console.log("Adding new cart item:", newItem);
        cart.push(newItem);
    }
    
    // Save cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart display
    updateCartDisplay();
    
    // Show success notification
    showNotification(`${product.Name} added to cart`, 'success');
}

// Remove item from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    
    // Save cart to localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Update cart display
    updateCartDisplay();
    
    showNotification('Item removed from cart', 'info');
}

// Update cart display
function updateCartDisplay() {
    const cartContainer = document.getElementById('cart-items');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    // Clear container
    cartContainer.innerHTML = '';
    
    console.log("Updating cart display, items:", cart);
    
    if (!cart || cart.length === 0) {
        cartContainer.innerHTML = '<div class="empty-cart">Your cart is empty</div>';
        checkoutBtn.disabled = true;
        
        // Reset totals
        document.getElementById('cart-subtotal').textContent = formatCurrency(0);
        document.getElementById('cart-tax').textContent = formatCurrency(0);
        document.getElementById('cart-total').textContent = formatCurrency(0);
        
        return;
    }
    
    // Calculate totals
    let subtotal = 0;
    
    // Add cart items
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        
        // Create price display based on whether there's a special price
        let priceDisplay = formatCurrency(item.price);
        if (item.hasSpecialPrice) {
            priceDisplay = `
                <div class="cart-price-container">
                    <span class="original-price">${formatCurrency(item.regularPrice)}</span>
                    <span class="discounted-price">${formatCurrency(item.price)}</span>
                </div>
            `;
        }
        
        cartItem.innerHTML = `
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}${item.hasSpecialPrice ? ' <span class="special-price-badge">Special</span>' : ''}</div>
                <div class="cart-item-price">${priceDisplay}</div>
                <div class="cart-item-quantity">
                    <div class="quantity-control-small">
                        <button class="decrease-btn" data-id="${item.id}">-</button>
                        <span>${item.quantity}</span>
                        <button class="increase-btn" data-id="${item.id}">+</button>
                    </div>
                </div>
            </div>
            <div class="cart-item-actions">
                <button class="cart-item-remove" data-id="${item.id}">×</button>
            </div>
        `;
        
        // Add event listeners
        cartItem.querySelector('.cart-item-remove').addEventListener('click', function() {
            removeFromCart(item.id);
        });
        
        // Add quantity controls
        if (cartItem.querySelector('.decrease-btn')) {
            cartItem.querySelector('.decrease-btn').addEventListener('click', function() {
                updateCartItemQuantity(item.id, item.quantity - 1);
            });
        }
        
        if (cartItem.querySelector('.increase-btn')) {
            cartItem.querySelector('.increase-btn').addEventListener('click', function() {
                updateCartItemQuantity(item.id, item.quantity + 1);
            });
        }
        
        cartContainer.appendChild(cartItem);
    });
    
    // Calculate tax and total
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    // Update summary
    document.getElementById('cart-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('cart-tax').textContent = formatCurrency(tax);
    document.getElementById('cart-total').textContent = formatCurrency(total);
    
    // Enable checkout button
    checkoutBtn.disabled = false;
}

// Update cart item quantity
function updateCartItemQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (!item) return;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    item.quantity = newQuantity;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
}

// Prepare checkout
function prepareCheckout() {
    // Populate order summary
    updateOrderSummary();
    
    // Show checkout modal
    document.getElementById('checkout-modal').style.display = 'block';
}

// Update order summary in checkout
function updateOrderSummary() {
    const summaryItemsContainer = document.getElementById('summary-items');
    summaryItemsContainer.innerHTML = '';
    
    // Calculate totals
    let subtotal = 0;
    
    // Add summary items
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-item';
        
        // Create price display
        let priceDisplay = formatCurrency(item.price);
        if (item.hasSpecialPrice) {
            priceDisplay = `<span class="original-price">${formatCurrency(item.regularPrice)}</span> ${formatCurrency(item.price)}`;
        }
        
        summaryItem.innerHTML = `
            <div class="summary-item-details">
                <div class="summary-item-name">${item.name}${item.hasSpecialPrice ? ' <span class="special-price-badge">Special</span>' : ''}</div>
                <div class="summary-item-price">${priceDisplay}</div>
                <div class="summary-item-quantity">Quantity: ${item.quantity}</div>
            </div>
            <div class="summary-item-total">${formatCurrency(itemTotal)}</div>
        `;
        
        summaryItemsContainer.appendChild(summaryItem);
    });
    
    // Calculate tax and total
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    // Update summary totals
    document.getElementById('summary-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('summary-tax').textContent = formatCurrency(tax);
    document.getElementById('summary-total').textContent = formatCurrency(total);
}

// Setup checkout event listeners
function setupCheckoutEvents() {
    const checkoutModal = document.getElementById('checkout-modal');
    const closeBtn = checkoutModal.querySelector('.close');
    const placeOrderBtn = document.getElementById('place-order-btn');
    
    // Close modal
    closeBtn.addEventListener('click', function() {
        checkoutModal.style.display = 'none';
    });
    
    // Place order
    placeOrderBtn.addEventListener('click', function() {
        placeOrder();
    });
    
    // Close when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === checkoutModal) {
            checkoutModal.style.display = 'none';
        }
    });
}

// Place order
function placeOrder() {
    const user = getCurrentUser();
    const isGuest = localStorage.getItem('userRole') === 'Guest';
    
    // Show loading state
    const placeOrderBtn = document.getElementById('place-order-btn');
    const originalBtnText = placeOrderBtn.textContent;
    placeOrderBtn.textContent = 'Processing...';
    placeOrderBtn.disabled = true;
    
    // Calculate totals
    let subtotal = 0;
    
    // Build products ordered text
    let productsOrderedText = "";
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        productsOrderedText += `${item.name} (${item.quantity}) - ${formatCurrency(itemTotal)}\n`;
    });
    
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    
    // Generate order ID
    const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    const currentDate = new Date();
    
    // Determine the Customer ID to use
    // For registered users, we should use their BPCode
    // For guests, use their name
    const customerId = isGuest ? (user.name || "Guest") : (user.bpCode || user.id || user.username || "Unknown");
    
    console.log("Creating order with Customer ID:", customerId);
    
    // Format values properly to match your Airtable schema
    const orderData = {
        fields: {
            "Customer ID": customerId,
            "Products Ordered": productsOrderedText,
            "Total Price": parseFloat(total.toFixed(2)),
            "Order Date": currentDate.toISOString(),
            "Order ID": orderId,
            "Timestamp": currentDate.toISOString()
        }
    };
    
    console.log("Creating order with data:", orderData);
    
    // Create order in AirTable
    fetch(`${API_URL}/Orders`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
    .then(response => {
        if (!response.ok) {
            console.error("Order creation failed with status:", response.status);
            return response.text().then(text => {
                console.error("Error response:", text);
                throw new Error(`Failed to create order: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Order created successfully:", data);
        
        // Update product stock (no separate order items table needed)
        const stockPromises = cart.map(item => {
            const product = products.find(p => p.id === item.id);
            if (!product) return Promise.resolve();
            
            const currentStock = product.Stock || 0;
            const newStock = Math.max(0, currentStock - item.quantity);
            
            console.log(`Updating stock for ${product.Name}: ${currentStock} -> ${newStock}`);
            
            return fetch(`${API_URL}/Products/${item.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        Stock: newStock
                    }
                })
            })
            .then(response => {
                if (!response.ok) {
                    console.warn(`Failed to update stock for product ${item.id}, but order was placed`);
                }
                return response;
            });
        });
        
        return Promise.all(stockPromises).then(() => orderId);
    })
    .then(orderId => {
        // Log the action
        try {
            logAccess(
                isGuest ? null : user.id,
                'Order Placed',
                `Order ${orderId} placed successfully`,
                isGuest ? user.name : null,
                isGuest ? user.email : null
            );
        } catch (error) {
            console.warn("Failed to log access, but order was placed successfully:", error);
        }
        
        // Clear cart
        cart = [];
        localStorage.removeItem('cart');
        
        // Update cart display
        updateCartDisplay();
        
        // Close modal
        document.getElementById('checkout-modal').style.display = 'none';
        
        // Show success notification
        showNotification('Order placed successfully! Order ID: ' + orderId, 'success');
    })
    .catch(error => {
        console.error('Error placing order:', error);
        showNotification('Failed to place order. Please try again.', 'error');
    })
    .finally(() => {
        // Reset button state
        placeOrderBtn.textContent = originalBtnText;
        placeOrderBtn.disabled = false;
    });
} 