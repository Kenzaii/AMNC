<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

// Debug log
error_log("Admin Dashboard - Session data: " . print_r($_SESSION, true));

// Case-insensitive role check
if (!isset($_SESSION['user_id']) || strtolower($_SESSION['role']) !== 'admin') {
    error_log("Unauthorized access attempt to admin dashboard");
    header('Location: ../login.php');
    exit();
}

// API Constants
define('AIRTABLE_URL', 'https://api.airtable.com/v0');
define('BASE_ID', 'appipp8LFUGElp3Di');
define('API_KEY', 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542');

// Add Airtable API helper function
function fetchAirtableData($table) {
    $headers = [
        'Authorization: Bearer ' . API_KEY,
        'Content-Type: application/json'
    ];

    // Base URL
    $url = AIRTABLE_URL . '/' . BASE_ID . '/' . urlencode($table);
    
    // Add sorting for Orders table
    if ($table === 'Orders') {
        // Properly encode the sort parameters
        $sortParams = [
            'sort[0][field]' => 'Order Date',
            'sort[0][direction]' => 'desc',
            'pageSize' => 100  // Ensure we get all records
        ];
        $url .= '?' . http_build_query($sortParams);
    }
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    
    if(curl_errno($ch)) {
        error_log('Curl error: ' . curl_error($ch));
        return false;
    }
    
    curl_close($ch);
    return json_decode($response, true);
}

// Add this before the HTML
$currentPage = $_GET['page'] ?? 'products';
$pageData = [];

// Fetch data based on current page
switch($currentPage) {
    case 'products':
        $pageData = fetchAirtableData('Products');
        break;
    case 'accounts':
        $pageData = fetchAirtableData('Users');
        break;
    case 'orders':
        $pageData = fetchAirtableData('Orders');
        break;
    case 'announcements':
        $pageData = fetchAirtableData('Announcements');
        break;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
        :root {
            --primary-color: #4e73df;
            --secondary-color: #858796;
            --success-color: #1cc88a;
            --info-color: #36b9cc;
            --warning-color: #f6c23e;
            --danger-color: #e74a3b;
            --light-color: #f8f9fc;
            --dark-color: #5a5c69;
        }

        body {
            background-color: #f8f9fc;
            overflow-x: hidden;
        }

        /* Sidebar Styles */
        .admin-sidebar {
            min-height: 100vh;
            width: 250px;
            background: #4e73df;
            background: linear-gradient(180deg, #4e73df 10%, #224abe 100%);
            position: fixed;
            left: 0;
            top: 0;
            padding-top: 20px;
            z-index: 1;
        }

        .admin-sidebar h3 {
            color: white;
            text-align: center;
            padding: 15px;
            margin-bottom: 20px;
            font-size: 1.2rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .admin-sidebar .nav-link {
            color: rgba(255,255,255,0.8);
            padding: 15px 20px;
            margin: 5px 15px;
            border-radius: 5px;
            transition: all 0.3s;
        }

        .admin-sidebar .nav-link:hover,
        .admin-sidebar .nav-link.active {
            background-color: rgba(255,255,255,0.1);
            color: white;
        }

        .admin-sidebar .nav-link i {
            margin-right: 10px;
            width: 20px;
            text-align: center;
        }

        /* Main Content Styles */
        #mainContent {
            margin-left: 250px;
            padding: 20px;
            min-height: 100vh;
        }

        /* Topbar Styles */
        .topbar {
            background-color: white;
            box-shadow: 0 0.15rem 1.75rem 0 rgba(58,59,69,0.15);
            margin-bottom: 24px;
            padding: 15px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .topbar h1 {
            font-size: 1.5rem;
            margin: 0;
            color: var(--dark-color);
        }

        /* Card Styles */
        .card {
            box-shadow: 0 0.15rem 1.75rem 0 rgba(58,59,69,0.15);
            border: none;
            border-radius: 0.35rem;
            margin-bottom: 24px;
        }

        .card-header {
            background-color: #f8f9fc;
            border-bottom: 1px solid #e3e6f0;
            padding: 15px 20px;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .admin-sidebar {
                width: 100px;
            }

            .admin-sidebar h3 {
                display: none;
            }

            .admin-sidebar .nav-link span {
                display: none;
            }

            .admin-sidebar .nav-link i {
                margin: 0;
                font-size: 1.2rem;
            }

            #mainContent {
                margin-left: 100px;
            }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <!-- Sidebar -->
        <nav class="admin-sidebar">
            <h3>Admin Panel</h3>
            <ul class="nav flex-column">
                <li class="nav-item">
                    <a class="nav-link <?php echo (!isset($_GET['page']) || $_GET['page'] == 'products') ? 'active' : ''; ?>" href="?page=products">
                        <i class="fas fa-box"></i>
                        <span>Products</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo (isset($_GET['page']) && $_GET['page'] == 'accounts') ? 'active' : ''; ?>" href="?page=accounts">
                        <i class="fas fa-users"></i>
                        <span>Accounts</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo (isset($_GET['page']) && $_GET['page'] == 'orders') ? 'active' : ''; ?>" href="?page=orders">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Orders</span>
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo (isset($_GET['page']) && $_GET['page'] == 'announcements') ? 'active' : ''; ?>" href="?page=announcements">
                        <i class="fas fa-bullhorn"></i>
                        <span>Announcements</span>
                    </a>
                </li>
                <li class="nav-item mt-auto">
                    <a class="nav-link" href="/OrderSys-main/user/logout.php">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </a>
                </li>
            </ul>
        </nav>

        <!-- Main Content -->
        <div id="mainContent">
            <!-- Topbar -->
            <div class="topbar">
                <h1>
                    <?php
                    $page = $_GET['page'] ?? 'products';
                    echo ucfirst($page);
                    ?>
                </h1>
                <div class="user-info">
                    <span>Welcome, Admin</span>
                </div>
            </div>

            <!-- Page Content -->
            <div class="container-fluid">
                <?php
                // Page routing
                $page = $_GET['page'] ?? 'products';
                
                switch($page) {
                    case 'products':
                        include 'pages/products.php';
                        break;
                    case 'accounts':
                        include 'pages/accounts.php';
                        break;
                    case 'orders':
                        include 'pages/orders.php';
                        break;
                    case 'announcements':
                        include 'pages/announcements.php';
                        break;
                    default:
                        include 'pages/products.php';
                }
                ?>
            </div>
        </div>
    </div>

    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js"></script>

    <!-- DataTables -->
    <script src="https://cdn.datatables.net/1.10.24/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.24/js/dataTables.bootstrap4.min.js"></script>

    <!-- Font Awesome -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/js/all.min.js"></script>

    <!-- Custom scripts -->
    <script>
        // Add these constants before including admin.js
        const AIRTABLE_URL = 'https://api.airtable.com/v0';
        const BASE_ID = 'appipp8LFUGElp3Di';
        const API_KEY = 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542';
    </script>
    <script src="js/admin.js"></script>

    <!-- Product Modal -->
    <div class="modal fade" id="productModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Product Details</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="productId">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" class="form-control" id="productName">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <textarea class="form-control" id="productDescription"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Price</label>
                        <input type="number" step="0.01" class="form-control" id="productPrice">
                    </div>
                    <div class="form-group">
                        <label>Image URL</label>
                        <input type="text" class="form-control" id="productImage">
                    </div>
                    <div class="form-group">
                        <label>Assigned Customers (comma-separated)</label>
                        <input type="text" class="form-control" id="productCustomers">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveProduct">Save</button>
                </div>
            </div>
        </div>
    </div>

    <!-- User Modal -->
    <div class="modal fade" id="userModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">User Details</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="userId">
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" class="form-control" id="username">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" class="form-control" id="password">
                    </div>
                    <div class="form-group">
                        <label>Role</label>
                        <select class="form-control" id="role">
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Customer ID</label>
                        <input type="text" class="form-control" id="customerId">
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveUser">Save</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Order Modal -->
    <div class="modal fade" id="orderModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Order Details</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body" id="orderDetails">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Announcement Modal -->
    <div class="modal fade" id="announcementModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Announcement Details</h5>
                    <button type="button" class="close" data-dismiss="modal">&times;</button>
                </div>
                <div class="modal-body">
                    <input type="hidden" id="announcementId">
                    <div class="form-group">
                        <label>Info</label>
                        <input type="text" class="form-control" id="announcementInfo">
                    </div>
                    <div class="form-group">
                        <label>Promotion</label>
                        <input type="text" class="form-control" id="announcementPromotion">
                    </div>
                    <div class="form-group">
                        <label>Warning</label>
                        <input type="text" class="form-control" id="announcementWarning">
                    </div>
                    <div class="form-group">
                        <div class="custom-control custom-switch">
                            <input type="checkbox" class="custom-control-input" id="announcementActive">
                            <label class="custom-control-label" for="announcementActive">Active</label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="saveAnnouncement">Save</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html> 