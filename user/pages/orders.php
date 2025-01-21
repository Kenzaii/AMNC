<?php
if (!defined('BASEPATH')) {
    exit('No direct script access allowed');
}

// Set timezone to Singapore
date_default_timezone_set('Asia/Singapore');

try {
    // Get user's CustomerID
    $userResponse = callAirtableAPI('Users', 'GET', null, [
        'filterByFormula' => "{Username}='" . addslashes($_SESSION['username']) . "'"
    ]);
    $customerID = $userResponse['records'][0]['fields']['CustomerID'] ?? null;

    // Get all orders for this customer
    $orderResponse = callAirtableAPI('Orders', 'GET', null, [
        'filterByFormula' => "{Customer ID}='" . addslashes($customerID) . "'"
    ]);
    $allOrders = $orderResponse['records'] ?? [];

    // Sort orders by date (newest first)
    usort($allOrders, function($a, $b) {
        $dateA = strtotime($a['fields']['Order Date'] ?? '');
        $dateB = strtotime($b['fields']['Order Date'] ?? '');
        return $dateB - $dateA;
    });

    // Filter orders based on time period
    $todayStart = strtotime('today');
    $todayEnd = strtotime('tomorrow') - 1;
    $monthStart = strtotime('first day of this month midnight');
    $monthEnd = strtotime('first day of next month midnight') - 1;

    $todayOrders = array_filter($allOrders, function($order) use ($todayStart, $todayEnd) {
        $orderTimestamp = strtotime($order['fields']['Order Date'] ?? '');
        return $orderTimestamp >= $todayStart && $orderTimestamp <= $todayEnd;
    });

    $monthOrders = array_filter($allOrders, function($order) use ($monthStart, $monthEnd) {
        $orderTimestamp = strtotime($order['fields']['Order Date'] ?? '');
        return $orderTimestamp >= $monthStart && $orderTimestamp <= $monthEnd;
    });

} catch (Exception $e) {
    error_log("Error fetching orders: " . $e->getMessage());
    $allOrders = [];
    $todayOrders = [];
    $monthOrders = [];
}

// Function to generate order details modal ID
function getOrderModalId($orderId) {
    return 'orderModal_' . preg_replace('/[^a-zA-Z0-9]/', '_', $orderId);
}
?>

<!-- Order Listing -->
<div class="container-fluid">
    <h1 class="h3 mb-2 text-gray-800">My Orders</h1>
    <p class="mb-4">View and track your order history</p>

    <!-- Order Period Selector -->
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <ul class="nav nav-pills" id="orderTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="today-tab" data-bs-toggle="pill" data-bs-target="#today" type="button">
                        Today's Orders (<?php echo count($todayOrders); ?>)
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="month-tab" data-bs-toggle="pill" data-bs-target="#month" type="button">
                        This Month (<?php echo count($monthOrders); ?>)
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="all-tab" data-bs-toggle="pill" data-bs-target="#all" type="button">
                        All Orders (<?php echo count($allOrders); ?>)
                    </button>
                </li>
            </ul>
        </div>
        <div class="card-body">
            <div class="tab-content" id="orderTabContent">
                <!-- Today's Orders -->
                <div class="tab-pane fade show active" id="today" role="tabpanel">
                    <?php if (!empty($todayOrders)): ?>
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Date</th>
                                        <th>Total</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($todayOrders as $order): ?>
                                        <tr>
                                            <td><?php echo htmlspecialchars($order['fields']['Order ID'] ?? 'N/A'); ?></td>
                                            <td><?php echo date('Y-m-d H:i', strtotime($order['fields']['Order Date'] ?? '')); ?></td>
                                            <td>$<?php echo number_format($order['fields']['Total Price'] ?? 0, 2); ?></td>
                                            <td>
                                                <button class="btn btn-primary btn-sm" 
                                                        data-bs-toggle="modal" 
                                                        data-bs-target="#<?php echo getOrderModalId($order['fields']['Order ID']); ?>">
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <p class="text-center">No orders placed today.</p>
                    <?php endif; ?>
                </div>

                <!-- This Month's Orders -->
                <div class="tab-pane fade" id="month" role="tabpanel">
                    <!-- Similar structure as Today's Orders -->
                    <?php if (!empty($monthOrders)): ?>
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Date</th>
                                        <th>Total</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($monthOrders as $order): ?>
                                        <tr>
                                            <td><?php echo htmlspecialchars($order['fields']['Order ID'] ?? 'N/A'); ?></td>
                                            <td><?php echo date('Y-m-d H:i', strtotime($order['fields']['Order Date'] ?? '')); ?></td>
                                            <td>$<?php echo number_format($order['fields']['Total Price'] ?? 0, 2); ?></td>
                                            <td>
                                                <button class="btn btn-primary btn-sm" 
                                                        data-bs-toggle="modal" 
                                                        data-bs-target="#<?php echo getOrderModalId($order['fields']['Order ID']); ?>">
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <p class="text-center">No orders placed this month.</p>
                    <?php endif; ?>
                </div>

                <!-- All Orders -->
                <div class="tab-pane fade" id="all" role="tabpanel">
                    <?php if (!empty($allOrders)): ?>
                        <div class="table-responsive">
                            <table class="table table-bordered">
                                <thead>
                                    <tr>
                                        <th>Order ID</th>
                                        <th>Date</th>
                                        <th>Total</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($allOrders as $order): ?>
                                        <tr>
                                            <td><?php echo htmlspecialchars($order['fields']['Order ID'] ?? 'N/A'); ?></td>
                                            <td><?php echo date('Y-m-d H:i', strtotime($order['fields']['Order Date'] ?? '')); ?></td>
                                            <td>$<?php echo number_format($order['fields']['Total Price'] ?? 0, 2); ?></td>
                                            <td>
                                                <button class="btn btn-primary btn-sm" 
                                                        data-bs-toggle="modal" 
                                                        data-bs-target="#<?php echo getOrderModalId($order['fields']['Order ID']); ?>">
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php else: ?>
                        <p class="text-center">No orders found.</p>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Order Detail Modals -->
<?php foreach ($allOrders as $order): ?>
    <div class="modal fade" id="<?php echo getOrderModalId($order['fields']['Order ID']); ?>" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Order Details</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <strong>Order ID:</strong> <?php echo htmlspecialchars($order['fields']['Order ID'] ?? 'N/A'); ?>
                    </div>
                    <div class="mb-3">
                        <strong>Date:</strong> <?php echo date('Y-m-d H:i', strtotime($order['fields']['Order Date'] ?? '')); ?>
                    </div>
                    <div class="mb-3">
                        <strong>Products Ordered:</strong>
                        <div class="mt-2">
                            <?php 
                            $products = explode(',', $order['fields']['Products Ordered'] ?? '');
                            foreach ($products as $product): 
                                $product = trim($product);
                                if (!empty($product)):
                            ?>
                                <div class="border-bottom py-2">
                                    <?php echo htmlspecialchars($product); ?>
                                </div>
                            <?php 
                                endif;
                            endforeach; 
                            ?>
                        </div>
                    </div>
                    <div class="mb-3">
                        <strong>Total Price:</strong> $<?php echo number_format($order['fields']['Total Price'] ?? 0, 2); ?>
                    </div>
                    <div class="mb-3">
                        <strong>Status:</strong> 
                        <span class="badge bg-<?php echo ($order['fields']['Status'] ?? 'Pending') === 'Completed' ? 'success' : 'warning'; ?>">
                            <?php echo htmlspecialchars($order['fields']['Status'] ?? 'Pending'); ?>
                        </span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>
<?php endforeach; ?> 