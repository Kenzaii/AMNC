<?php
if (!defined('BASEPATH')) {
    exit('No direct script access allowed');
}

// Include cart operations
require_once 'includes/cart_operations.php';

try {
    // Get user's CustomerID
    $userResponse = callAirtableAPI('Users', 'GET', null, [
        'filterByFormula' => "{Username}='" . addslashes($_SESSION['username']) . "'"
    ]);
    $customerID = $userResponse['records'][0]['fields']['CustomerID'] ?? null;

    // Get all products
    $response = callAirtableAPI('Products', 'GET');
    $products = $response['records'] ?? [];

    // Get user's orders
    $orderResponse = callAirtableAPI('Orders', 'GET', null, [
        'filterByFormula' => "{Customer ID}='" . addslashes($customerID) . "'"
    ]);
    $orders = $orderResponse['records'] ?? [];

    // Track ordered products
    $orderedProducts = [];
    foreach ($products as $product) {
        $productName = $product['fields']['Name'] ?? '';
        $orderedProducts[$productName] = [
            'count' => 0,
            'product' => $product
        ];
    }

    // Count product occurrences in orders
    foreach ($orders as $order) {
        $productsOrdered = $order['fields']['Products Ordered'] ?? '';
        foreach ($products as $product) {
            $productName = $product['fields']['Name'] ?? '';
            if (strpos($productsOrdered, $productName) !== false) {
                $orderedProducts[$productName]['count']++;
            }
        }
    }

    // Sort by order count
    uasort($orderedProducts, function($a, $b) {
        return $b['count'] <=> $a['count'];
    });

    // Get top 4 ordered products
    $favoriteProducts = array_slice($orderedProducts, 0, 4, true);

} catch (Exception $e) {
    error_log("Error in products page: " . $e->getMessage());
    $products = [];
    $favoriteProducts = [];
}
?>

<div class="container-fluid">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="h3 mb-0 text-gray-800">Products</h1>
        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#cartModal">
            <i class="fas fa-shopping-cart"></i> 
            Cart (<span id="cartCount"><?php echo count($_SESSION['cart']); ?></span>)
        </button>
    </div>

    <p class="mb-4">Browse available products and place orders.</p>

    <!-- Navigation Tabs -->
    <ul class="nav nav-tabs mb-4">
        <li class="nav-item">
            <a class="nav-link active" id="favorites-tab" data-bs-toggle="tab" href="#favorites">
                Most Ordered
            </a>
        </li>
        <li class="nav-item">
            <a class="nav-link" id="all-products-tab" data-bs-toggle="tab" href="#all-products">
                All Products
            </a>
        </li>
    </ul>

    <!-- Tab Content -->
    <div class="tab-content">
        <!-- Most Ordered Tab -->
        <div class="tab-pane fade show active" id="favorites">
            <div class="row">
                <?php if (!empty($favoriteProducts)): ?>
                    <?php foreach ($favoriteProducts as $productName => $data): 
                        if ($data['count'] > 0):
                            $product = $data['product'];
                    ?>
                        <div class="col-xl-3 col-md-6 mb-4">
                            <div class="card border-0 shadow">
                                <?php if (!empty($product['fields']['ImageURL'])): ?>
                                    <img src="<?php echo htmlspecialchars($product['fields']['ImageURL']); ?>" 
                                         class="card-img-top" 
                                         alt="<?php echo htmlspecialchars($productName); ?>"
                                         style="height: 200px; object-fit: cover;">
                                <?php else: ?>
                                    <div class="card-img-top bg-light d-flex align-items-center justify-content-center" 
                                         style="height: 200px;">
                                        <i class="fas fa-image fa-3x text-secondary"></i>
                                    </div>
                                <?php endif; ?>
                                <div class="card-body">
                                    <div class="badge bg-success float-end">
                                        Ordered <?php echo $data['count']; ?> times
                                    </div>
                                    <h5 class="card-title">
                                        <?php echo htmlspecialchars($productName); ?>
                                    </h5>
                                    <p class="card-text">
                                        <?php 
                                        $description = $product['fields']['Descriptions'] ?? '';
                                        echo $description ? htmlspecialchars($description) : 'No description available';
                                        ?>
                                    </p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="h5 mb-0">
                                            $<?php echo number_format($product['fields']['Price'] ?? 0, 2); ?>
                                        </span>
                                        <button class="btn btn-primary order-product" 
                                                data-product-id="<?php echo $product['id']; ?>"
                                                data-product-name="<?php echo htmlspecialchars($productName); ?>"
                                                data-product-price="<?php echo $product['fields']['Price'] ?? 0; ?>"
                                                data-product-image="<?php echo htmlspecialchars($product['fields']['ImageURL'] ?? ''); ?>">
                                            <?php echo isset($topFavorites[$product['fields']['Name'] ?? '']) ? 'Order Again' : 'Order Now'; ?>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php 
                        endif;
                    endforeach; 
                    ?>
                <?php else: ?>
                    <div class="col-12">
                        <div class="alert alert-info">
                            Start ordering to see your most ordered products here!
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- All Products Tab -->
        <div class="tab-pane fade" id="all-products">
            <div class="row">
                <?php if (!empty($products)): ?>
                    <?php foreach ($products as $product): ?>
                        <div class="col-xl-3 col-md-6 mb-4">
                            <div class="card border-0 shadow">
                                <?php if (!empty($product['fields']['ImageURL'])): ?>
                                    <img src="<?php echo htmlspecialchars($product['fields']['ImageURL']); ?>" 
                                         class="card-img-top" 
                                         alt="<?php echo htmlspecialchars($product['fields']['Name'] ?? 'Product Image'); ?>"
                                         style="height: 200px; object-fit: cover;">
                                <?php else: ?>
                                    <div class="card-img-top bg-light d-flex align-items-center justify-content-center" 
                                         style="height: 200px;">
                                        <i class="fas fa-image fa-3x text-secondary"></i>
                                    </div>
                                <?php endif; ?>
                                <div class="card-body">
                                    <h5 class="card-title">
                                        <?php echo htmlspecialchars($product['fields']['Name'] ?? 'Unnamed Product'); ?>
                                    </h5>
                                    <p class="card-text">
                                        <?php 
                                        $description = $product['fields']['Descriptions'] ?? '';
                                        echo $description ? htmlspecialchars($description) : 'No description available';
                                        ?>
                                    </p>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="h5 mb-0">
                                            $<?php echo number_format($product['fields']['Price'] ?? 0, 2); ?>
                                        </span>
                                        <button class="btn btn-primary order-product" 
                                                data-product-id="<?php echo $product['id']; ?>"
                                                data-product-name="<?php echo htmlspecialchars($product['fields']['Name'] ?? 'Unnamed Product'); ?>"
                                                data-product-price="<?php echo $product['fields']['Price'] ?? 0; ?>"
                                                data-product-image="<?php echo htmlspecialchars($product['fields']['ImageURL'] ?? ''); ?>">
                                            <?php echo isset($topFavorites[$product['fields']['Name'] ?? '']) ? 'Order Again' : 'Order Now'; ?>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php else: ?>
                    <div class="col-12">
                        <div class="alert alert-info">
                            No products available at the moment.
                        </div>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Order Modal -->
<div class="modal fade" id="orderModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Place Order</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <form id="orderForm">
                    <input type="hidden" id="productId" name="productId">
                    <div class="mb-3">
                        <label for="productName" class="form-label">Product</label>
                        <input type="text" class="form-control" id="productName" readonly>
                    </div>
                    <div class="mb-3">
                        <label for="quantity" class="form-label">Quantity</label>
                        <input type="number" class="form-control" id="quantity" name="quantity" min="1" value="1">
                    </div>
                    <div class="mb-3">
                        <label for="totalPrice" class="form-label">Total Price</label>
                        <input type="text" class="form-control" id="totalPrice" readonly>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirmOrder">Place Order</button>
            </div>
        </div>
    </div>
</div>

<!-- Add Cart Modal -->
<div class="modal fade" id="cartModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Shopping Cart</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div id="cartContents">
                    <?php if (!empty($_SESSION['cart'])): ?>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Price</th>
                                    <th>Quantity</th>
                                    <th>Subtotal</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($_SESSION['cart'] as $item): ?>
                                    <tr>
                                        <td><?php echo htmlspecialchars($item['name']); ?></td>
                                        <td>$<?php echo number_format($item['price'], 2); ?></td>
                                        <td>
                                            <input type="number" 
                                                   class="form-control form-control-sm cart-quantity" 
                                                   value="<?php echo $item['quantity']; ?>"
                                                   min="1"
                                                   data-product-id="<?php echo $item['id']; ?>">
                                        </td>
                                        <td>$<?php echo number_format($item['subtotal'], 2); ?></td>
                                        <td>
                                            <button class="btn btn-danger btn-sm remove-from-cart"
                                                    data-product-id="<?php echo $item['id']; ?>">
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="3" class="text-end"><strong>Total:</strong></td>
                                    <td colspan="2"><strong>$<?php echo number_format(getCartTotal(), 2); ?></strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    <?php else: ?>
                        <p class="text-center">Your cart is empty</p>
                    <?php endif; ?>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Continue Shopping</button>
                <?php if (!empty($_SESSION['cart'])): ?>
                    <button type="button" class="btn btn-danger" id="clearCart">Clear Cart</button>
                    <button type="button" class="btn btn-primary" id="placeOrder">Place Order</button>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Add this new modal for quantity selection -->
<div class="modal fade" id="quantityModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Select Quantity</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="text-center mb-3" id="productImageContainer">
                    <!-- Only one of these will be shown at a time -->
                    <img id="selectedProductImage" 
                         src="" 
                         alt="Product Image" 
                         style="max-height: 200px; width: auto;"
                         class="img-fluid mb-3 d-none">
                    <div id="noImagePlaceholder" 
                         class="bg-light d-flex align-items-center justify-content-center d-none" 
                         style="height: 200px;">
                        <i class="fas fa-image fa-3x text-secondary"></i>
                    </div>
                </div>
                <div class="mb-3">
                    <label for="productQuantity" class="form-label">Quantity</label>
                    <input type="number" class="form-control" id="productQuantity" min="1" value="1">
                </div>
                <p><strong>Product:</strong> <span id="selectedProductName"></span></p>
                <p><strong>Price:</strong> $<span id="selectedProductPrice"></span></p>
                <p><strong>Total:</strong> $<span id="selectedProductTotal"></span></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirmAddToCart">Add to Cart</button>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    let selectedProduct = null;
    const quantityModal = new bootstrap.Modal(document.getElementById('quantityModal'));
    const quantityInput = document.getElementById('productQuantity');
    const productImage = document.getElementById('selectedProductImage');
    const noImagePlaceholder = document.getElementById('noImagePlaceholder');

    // Update total when quantity changes
    quantityInput.addEventListener('change', updateTotal);
    quantityInput.addEventListener('keyup', updateTotal);

    function updateTotal() {
        const quantity = parseInt(quantityInput.value) || 1;
        const price = parseFloat(selectedProduct.price);
        const total = price * quantity;
        document.getElementById('selectedProductTotal').textContent = total.toFixed(2);
    }

    // Add to Cart
    function initializeOrderButtons() {
        const orderButtons = document.querySelectorAll('.order-product');
        orderButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Store selected product info
                selectedProduct = {
                    id: this.dataset.productId,
                    name: this.dataset.productName,
                    price: this.dataset.productPrice,
                    image: this.dataset.productImage
                };

                // Update modal with product info
                document.getElementById('selectedProductName').textContent = selectedProduct.name;
                document.getElementById('selectedProductPrice').textContent = selectedProduct.price;
                
                // Handle product image
                if (selectedProduct.image && selectedProduct.image.trim() !== '') {
                    productImage.src = selectedProduct.image;
                    productImage.classList.remove('d-none');
                    noImagePlaceholder.classList.add('d-none');
                } else {
                    productImage.classList.add('d-none');
                    noImagePlaceholder.classList.remove('d-none');
                }

                quantityInput.value = 1;
                updateTotal();

                // Show quantity modal
                quantityModal.show();
            });
        });
    }

    // Handle Add to Cart confirmation
    document.getElementById('confirmAddToCart').addEventListener('click', function() {
        const quantity = parseInt(quantityInput.value) || 1;

        fetch('includes/cart_handler.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add',
                productId: selectedProduct.id,
                quantity: quantity
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                quantityModal.hide();
                alert('Product added to cart');
                updateCartDisplay();
            } else {
                alert(data.message || 'Error adding product to cart');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error adding product to cart');
        });
    });

    // Initialize buttons when page loads
    initializeOrderButtons();

    // Update Cart Quantity
    function initializeCartQuantityInputs() {
        document.querySelectorAll('.cart-quantity').forEach(input => {
            input.addEventListener('change', function() {
                const productId = this.dataset.productId;
                const quantity = parseInt(this.value) || 1;

                fetch('includes/cart_handler.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'update',
                        productId: productId,
                        quantity: quantity
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        updateCartDisplay();
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            });
        });
    }

    // Initialize quantity inputs
    initializeCartQuantityInputs();

    // Remove from Cart
    function initializeRemoveButtons() {
        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.dataset.productId;

                fetch('includes/cart_handler.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'remove',
                        productId: productId
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        updateCartDisplay();
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            });
        });
    }

    // Initialize remove buttons
    initializeRemoveButtons();

    // Clear Cart
    const clearCartButton = document.getElementById('clearCart');
    if (clearCartButton) {
        clearCartButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear your cart?')) {
                fetch('includes/cart_handler.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'clear'
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        updateCartDisplay();
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                });
            }
        });
    }

    // Place Order
    const placeOrderButton = document.getElementById('placeOrder');
    if (placeOrderButton) {
        placeOrderButton.addEventListener('click', function() {
            if (confirm('Are you sure you want to place this order?')) {
                fetch('includes/cart_handler.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'place_order'
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Order placed successfully! Order ID: ' + data.orderId);
                        updateCartDisplay();
                        const modal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
                        if (modal) {
                            modal.hide();
                        }
                    } else {
                        alert(data.message || 'Error placing order');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error placing order');
                });
            }
        });
    }

    function updateCartDisplay() {
        location.reload(); // For simplicity, reload the page
    }
});
</script> 