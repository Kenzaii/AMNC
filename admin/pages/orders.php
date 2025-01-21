<?php
// Only keep the timeAgo function here
function timeAgo($datetime) {
    $timestamp = strtotime($datetime);
    $now = time();
    $diff = $now - $timestamp;

    if ($diff < 60) {
        return "Just now";
    } elseif ($diff < 3600) {
        $mins = floor($diff / 60);
        return $mins . " minute" . ($mins > 1 ? "s" : "") . " ago";
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return $hours . " hour" . ($hours > 1 ? "s" : "") . " ago";
    } elseif ($diff < 604800) {
        $days = floor($diff / 86400);
        return $days . " day" . ($days > 1 ? "s" : "") . " ago";
    } elseif ($diff < 2592000) {
        $weeks = floor($diff / 604800);
        return $weeks . " week" . ($weeks > 1 ? "s" : "") . " ago";
    } elseif ($diff < 31536000) {
        $months = floor($diff / 2592000);
        return $months . " month" . ($months > 1 ? "s" : "") . " ago";
    } else {
        $years = floor($diff / 31536000);
        return $years . " year" . ($years > 1 ? "s" : "") . " ago";
    }
}
?>

<div class="card shadow mb-4">
    <div class="card-header py-3">
        <h6 class="m-0 font-weight-bold text-primary">Orders</h6>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-bordered" id="ordersTable">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer ID</th>
                        <th>Products Ordered</th>
                        <th>Total Price</th>
                        <th>Order Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    if ($pageData && isset($pageData['records'])) {
                        $records = $pageData['records'];
                        
                        // Convert dates to timestamps for proper sorting
                        foreach ($records as &$record) {
                            $record['timestamp'] = strtotime($record['fields']['Order Date'] ?? '0');
                        }
                        
                        // Sort by timestamp
                        usort($records, function($a, $b) {
                            return $b['timestamp'] - $a['timestamp'];
                        });

                        foreach ($records as $record) {
                            $fields = $record['fields'];
                            $orderDate = $fields['Order Date'] ?? '';
                            $formattedDate = date('M d, Y h:i A', strtotime($orderDate));
                            
                            echo "<tr>";
                            echo "<td>" . htmlspecialchars($fields['Order ID'] ?? '') . "</td>";
                            echo "<td>" . htmlspecialchars($fields['Customer ID'] ?? '') . "</td>";
                            echo "<td>" . htmlspecialchars($fields['Products Ordered'] ?? '') . "</td>";
                            echo "<td>$" . number_format($fields['Total Price'] ?? 0, 2) . "</td>";
                            echo "<td>" . $formattedDate . "<br><small class='text-muted'>" . timeAgo($orderDate) . "</small></td>";
                            echo "<td>
                                    <button class='btn btn-sm btn-info view-order' data-id='" . $record['id'] . "'>
                                        <i class='fas fa-eye'></i> View
                                    </button>
                                    <button class='btn btn-sm btn-danger delete-order' data-id='" . $record['id'] . "'>
                                        <i class='fas fa-trash'></i> Delete
                                    </button>
                                  </td>";
                            echo "</tr>";
                        }
                    }
                    ?>
                </tbody>
            </table>
        </div>
    </div>
</div> 