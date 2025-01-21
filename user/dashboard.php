<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();

// Define BASEPATH
define('BASEPATH', true);

// Include database configuration
require_once '../config/database.php';

// Debug log
error_log("\n=== User Dashboard Access ===");
error_log("Session data: " . print_r($_SESSION, true));

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    error_log("No user_id in session");
    header('Location: ../login.php');
    exit();
}

// Allow access for customers
$userRole = strtolower($_SESSION['role'] ?? '');
error_log("User role: " . $userRole);

if ($userRole !== 'customer') {
    error_log("Unauthorized role tried to access user dashboard: " . $userRole);
    header('Location: ../login.php');
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Dashboard</title>
    
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    
    <style>
        :root {
            --primary-color: #000000;
            --secondary-color: #ff4d30;
            --text-color: #333333;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #f8f8f8;
        }

        .wrapper {
            display: flex;
            min-height: 100vh;
        }

        .customer-sidebar {
            width: 250px;
            background-color: var(--primary-color);
            color: white;
            padding: 20px;
            position: fixed;
            height: 100vh;
        }

        .customer-sidebar h3 {
            color: var(--secondary-color);
            margin-bottom: 30px;
            font-size: 1.5rem;
        }

        .customer-sidebar .nav-link {
            color: white;
            padding: 10px 15px;
            margin-bottom: 5px;
            border-radius: 5px;
            transition: all 0.3s;
        }

        .customer-sidebar .nav-link:hover,
        .customer-sidebar .nav-link.active {
            background-color: var(--secondary-color);
        }

        .customer-sidebar .nav-link i {
            margin-right: 10px;
            width: 20px;
            text-align: center;
        }

        .main-content {
            flex: 1;
            margin-left: 250px;
            padding: 20px;
        }

        .card {
            border: none;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .card-header {
            background-color: white;
            border-bottom: 2px solid #f0f0f0;
            padding: 15px 20px;
        }

        .btn-primary {
            background-color: var(--secondary-color);
            border-color: var(--secondary-color);
        }

        .btn-primary:hover {
            background-color: #ff3916;
            border-color: #ff3916;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <!-- Sidebar -->
        <nav class="customer-sidebar">
            <h3>Customer Panel</h3>
            <ul class="nav flex-column">
                <li class="nav-item">
                    <a class="nav-link <?php echo !isset($_GET['page']) || $_GET['page'] == 'dashboard' ? 'active' : ''; ?>" 
                       href="?page=dashboard">
                        <i class="fas fa-home"></i> Dashboard
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo isset($_GET['page']) && $_GET['page'] == 'orders' ? 'active' : ''; ?>" 
                       href="?page=orders">
                        <i class="fas fa-shopping-cart"></i> My Orders
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo isset($_GET['page']) && $_GET['page'] == 'products' ? 'active' : ''; ?>" 
                       href="?page=products">
                        <i class="fas fa-box"></i> Products
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link <?php echo isset($_GET['page']) && $_GET['page'] == 'profile' ? 'active' : ''; ?>" 
                       href="?page=profile">
                        <i class="fas fa-user"></i> My Profile
                    </a>
                </li>
                <li class="nav-item mt-auto">
                    <a class="dropdown-item" href="/OrderSys-main/user/logout.php">
                        <i class="fas fa-sign-out-alt fa-sm fa-fw mr-2 text-gray-400"></i>
                        Logout
                    </a>
                </li>
            </ul>
        </nav>

        <!-- Main Content -->
        <div class="main-content">
            <?php
            $page = $_GET['page'] ?? 'dashboard';
            
            switch($page) {
                case 'dashboard':
                    include 'pages/dashboard_home.php';
                    break;
                case 'orders':
                    include 'pages/orders.php';
                    break;
                case 'products':
                    include 'pages/products.php';
                    break;
                case 'profile':
                    include 'pages/profile.php';
                    break;
                default:
                    include 'pages/dashboard_home.php';
            }
            ?>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> 