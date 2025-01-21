<?php
define('BASEPATH', true);
require_once '../../config/database.php';
require_once 'cart_operations.php';

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {
    case 'add':
        $response = addToCart($input['productId'], $input['quantity']);
        break;

    case 'remove':
        $response = removeFromCart($input['productId']);
        break;

    case 'update':
        $response = updateCartQuantity($input['productId'], $input['quantity']);
        break;

    case 'clear':
        clearCart();
        $response = ['success' => true, 'message' => 'Cart cleared'];
        break;

    case 'place_order':
        $response = placeOrder();
        break;

    default:
        $response = ['success' => false, 'message' => 'Invalid action'];
}

echo json_encode($response); 