<?php
// Check if this file is included from the main dashboard
if (!defined('BASEPATH')) {
    exit('No direct script access allowed');
}

// Get customer information
try {
    // Get user's CustomerID
    $userResponse = callAirtableAPI('Users', 'GET', null, [
        'filterByFormula' => "{Username}='" . addslashes($_SESSION['username']) . "'"
    ]);
    $customerID = $userResponse['records'][0]['fields']['CustomerID'] ?? null;

    // Get order count and total spending
    $orderResponse = callAirtableAPI('Orders', 'GET', null, [
        'filterByFormula' => "{Customer ID}='" . addslashes($customerID) . "'"
    ]);
    $orders = $orderResponse['records'] ?? [];
    $orderCount = count($orders);
    $totalSpending = array_reduce($orders, function($carry, $order) {
        return $carry + ($order['fields']['Total Price'] ?? 0);
    }, 0);

    // Get available products
    $productResponse = callAirtableAPI('Products', 'GET');
    $products = $productResponse['records'] ?? [];
    $availableProducts = count($products);

} catch (Exception $e) {
    error_log("Dashboard Error: " . $e->getMessage());
    $orderCount = 0;
    $totalSpending = 0;
    $availableProducts = 0;
}
?>

<div class="container-fluid">
    <div class="d-sm-flex align-items-center justify-content-between mb-4">
        <h1 class="h3 mb-0 text-gray-800">Dashboard</h1>
    </div>

    <!-- Content Row -->
    <div class="row">
        <!-- Total Orders Card -->
        <div class="col-xl-4 col-md-6 mb-4">
            <div class="card border-left-primary shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                Total Orders</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo $orderCount; ?></div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-shopping-cart fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Total Spending Card -->
        <div class="col-xl-4 col-md-6 mb-4">
            <div class="card border-left-success shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-success text-uppercase mb-1">
                                Total Spending</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800">$<?php echo number_format($totalSpending, 2); ?></div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-dollar-sign fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Available Products Card -->
        <div class="col-xl-4 col-md-6 mb-4">
            <div class="card border-left-info shadow h-100 py-2">
                <div class="card-body">
                    <div class="row no-gutters align-items-center">
                        <div class="col mr-2">
                            <div class="text-xs font-weight-bold text-info text-uppercase mb-1">
                                Available Products</div>
                            <div class="h5 mb-0 font-weight-bold text-gray-800"><?php echo $availableProducts; ?></div>
                        </div>
                        <div class="col-auto">
                            <i class="fas fa-box fa-2x text-gray-300"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Orders -->
    <div class="card shadow mb-4">
        <div class="card-header py-3">
            <h6 class="m-0 font-weight-bold text-primary">Recent Orders</h6>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered" width="100%" cellspacing="0">
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Products</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                        if (!empty($orders)) {
                            // Display only the 5 most recent orders
                            $recentOrders = array_slice($orders, 0, 5);
                            foreach ($recentOrders as $order): 
                        ?>
                            <tr>
                                <td><?php echo htmlspecialchars($order['fields']['Order ID'] ?? 'N/A'); ?></td>
                                <td>
                                    <?php 
                                    $date = $order['fields']['Order Date'] ?? '';
                                    echo $date ? date('Y-m-d', strtotime($date)) : 'N/A';
                                    ?>
                                </td>
                                <td><?php echo htmlspecialchars($order['fields']['Products Ordered'] ?? 'N/A'); ?></td>
                                <td>$<?php echo number_format($order['fields']['Total Price'] ?? 0, 2); ?></td>
                            </tr>
                        <?php 
                            endforeach;
                        } else {
                        ?>
                            <tr>
                                <td colspan="4" class="text-center">No orders found</td>
                            </tr>
                        <?php 
                        } 
                        ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div> 