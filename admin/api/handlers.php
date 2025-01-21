<?php
// API Handler file
require_once '../../config/database.php';

// Check if request is authorized
function checkAuth() {
    if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'Admin') {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

// Handle API requests
$action = $_GET['action'] ?? '';

switch($action) {
    case 'updateOrderStatus':
        checkAuth();
        updateOrderStatus();
        break;
        
    case 'toggleAccountStatus':
        checkAuth();
        toggleAccountStatus();
        break;
        
    case 'saveAnnouncement':
        checkAuth();
        saveAnnouncement();
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Invalid action']);
        exit;
}

function updateOrderStatus() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $orderId = $data['orderId'] ?? '';
        $status = $data['status'] ?? '';
        
        if (!$orderId || !$status) {
            throw new Exception('Missing required fields');
        }

        $result = callAirtableAPI("Orders/$orderId", 'PATCH', [
            'fields' => ['Status' => $status]
        ]);
        
        echo json_encode(['success' => true, 'data' => $result]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function toggleAccountStatus() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $userId = $data['userId'] ?? '';
        $isDisabled = $data['isDisabled'] ?? false;
        
        if (!$userId) {
            throw new Exception('Missing user ID');
        }

        $result = callAirtableAPI("Users/$userId", 'PATCH', [
            'fields' => ['IsDisabled' => $isDisabled]
        ]);
        
        echo json_encode(['success' => true, 'data' => $result]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function saveAnnouncement() {
    try {
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;
        $fields = $data['fields'] ?? [];
        
        if (empty($fields['Title']) || empty($fields['Message'])) {
            throw new Exception('Missing required fields');
        }

        if ($id) {
            // Update existing announcement
            $result = callAirtableAPI("Announcements/$id", 'PATCH', [
                'fields' => $fields
            ]);
        } else {
            // Create new announcement
            $result = callAirtableAPI('Announcements', 'POST', [
                'fields' => $fields
            ]);
        }
        
        echo json_encode(['success' => true, 'data' => $result]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
} 