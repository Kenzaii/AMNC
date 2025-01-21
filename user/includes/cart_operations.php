<?php
if (!defined('BASEPATH')) {
    exit('No direct script access allowed');
}

// Only start session if one isn't already active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Initialize cart if it doesn't exist
if (!isset($_SESSION['cart'])) {
    $_SESSION['cart'] = [];
}

function addToCart($productId, $quantity) {
    $response = callAirtableAPI('Products', 'GET', null, [
        'filterByFormula' => "RECORD_ID()='$productId'"
    ]);

    if (!empty($response['records'])) {
        $product = $response['records'][0];
        $cartItem = [
            'id' => $productId,
            'name' => $product['fields']['Name'],
            'price' => $product['fields']['Price'],
            'quantity' => $quantity,
            'image' => $product['fields']['ImageURL'] ?? '',
            'subtotal' => $product['fields']['Price'] * $quantity
        ];

        $_SESSION['cart'][$productId] = $cartItem;
        return ['success' => true, 'message' => 'Product added to cart'];
    }

    return ['success' => false, 'message' => 'Product not found'];
}

function removeFromCart($productId) {
    if (isset($_SESSION['cart'][$productId])) {
        unset($_SESSION['cart'][$productId]);
        return ['success' => true, 'message' => 'Product removed from cart'];
    }
    return ['success' => false, 'message' => 'Product not found in cart'];
}

function updateCartQuantity($productId, $quantity) {
    if (isset($_SESSION['cart'][$productId])) {
        $_SESSION['cart'][$productId]['quantity'] = $quantity;
        $_SESSION['cart'][$productId]['subtotal'] = 
            $_SESSION['cart'][$productId]['price'] * $quantity;
        return ['success' => true, 'message' => 'Quantity updated'];
    }
    return ['success' => false, 'message' => 'Product not found in cart'];
}

function getCartTotal() {
    return array_reduce($_SESSION['cart'], function($carry, $item) {
        return $carry + $item['subtotal'];
    }, 0);
}

function clearCart() {
    $_SESSION['cart'] = [];
}

function placeOrder() {
    if (empty($_SESSION['cart'])) {
        return ['success' => false, 'message' => 'Cart is empty'];
    }

    try {
        // Get customer ID
        $userResponse = callAirtableAPI('Users', 'GET', null, [
            'filterByFormula' => "{Username}='" . addslashes($_SESSION['username']) . "'"
        ]);
        $customerID = $userResponse['records'][0]['fields']['CustomerID'] ?? null;

        if (!$customerID) {
            return ['success' => false, 'message' => 'Customer ID not found'];
        }

        // Prepare order data
        $products = array_map(function($item) {
            return $item['name'] . ' (x' . $item['quantity'] . ')';
        }, $_SESSION['cart']);

        $orderData = [
            'fields' => [
                'Customer ID' => $customerID,
                'Products Ordered' => implode(', ', $products),
                'Total Price' => getCartTotal(),
                'Order Date' => date('Y-m-d'),
                'Order ID' => uniqid('ORD-')
            ]
        ];

        // Create order in Airtable
        $response = callAirtableAPI('Orders', 'POST', $orderData);

        if (!empty($response['id'])) {
            clearCart();
            return [
                'success' => true, 
                'message' => 'Order placed successfully',
                'orderId' => $response['fields']['Order ID']
            ];
        }

        return ['success' => false, 'message' => 'Failed to create order'];

    } catch (Exception $e) {
        error_log("Order placement error: " . $e->getMessage());
        return ['success' => false, 'message' => 'Error placing order'];
    }
} 