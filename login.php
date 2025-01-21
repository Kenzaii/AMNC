<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

// Start session
session_start();

// Include database configuration
require_once 'config/database.php';

// Debug log setup
$logFile = __DIR__ . '/debug.log';
ini_set('error_log', $logFile);
error_log("\n\n=== New Login Attempt ===");
error_log("Time: " . date('Y-m-d H:i:s'));

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        error_log("Login attempt with:");
        error_log("Username: " . $username);
        error_log("Password provided: " . ($password ? 'Yes' : 'No'));

        // First, let's get all users to see what's in the database
        $allUsers = callAirtableAPI('Users', 'GET');
        error_log("All users in database:");
        error_log(print_r($allUsers, true));

        // Now try to find our specific user
        $response = callAirtableAPI('Users', 'GET', null, [
            'filterByFormula' => "{Username}='" . addslashes($username) . "'"
        ]);
        
        error_log("Filtered response for username '$username':");
        error_log(print_r($response, true));

        if (!empty($response['records'])) {
            $user = $response['records'][0];
            error_log("User found:");
            error_log(print_r($user, true));

            // Check if Password field exists
            if (!isset($user['fields']['Password'])) {
                error_log("ERROR: Password field not found in user record");
                throw new Exception('Invalid user data structure');
            }

            // Compare passwords
            error_log("Comparing passwords:");
            error_log("Stored password: " . $user['fields']['Password']);
            error_log("Provided password matches: " . ($user['fields']['Password'] === $password ? 'Yes' : 'No'));

            if ($user['fields']['Password'] === $password) {
                error_log("Password matched successfully");

                // Store session data
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['fields']['Username'];
                $_SESSION['role'] = $user['fields']['Role'];

                error_log("Session data set:");
                error_log(print_r($_SESSION, true));

                // Case-insensitive role check
                if (strtolower($_SESSION['role']) === 'admin') {
                    error_log("Redirecting to admin dashboard");
                    echo "<script>
                        window.location.href = 'admin/dashboard.php';
                    </script>";
                    header("Location: admin/dashboard.php");
                    exit();
                } else {
                    error_log("Redirecting to user dashboard");
                    echo "<script>
                        window.location.href = 'user/dashboard.php';
                    </script>";
                    header("Location: user/dashboard.php");
                    exit();
                }
            } else {
                error_log("Password mismatch");
                throw new Exception('Invalid username or password');
            }
        } else {
            error_log("No user found with username: " . $username);
            throw new Exception('Invalid username or password');
        }
    } catch (Exception $e) {
        $error = $e->getMessage();
        error_log("Error occurred: " . $e->getMessage());
    }
}

// Debug current session state
error_log("Current session state:");
error_log(print_r($_SESSION, true));
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Order System</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: var(--background-color, #f8f8f8);
            font-family: Arial, sans-serif;
        }
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            padding: 30px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .login-header h2 {
            color: #000;
            margin-bottom: 10px;
        }
        .form-control {
            border-radius: 4px;
            padding: 10px 15px;
        }
        .btn-primary {
            background-color: #ff4d30;
            border-color: #ff4d30;
            padding: 10px;
            font-weight: 500;
        }
        .btn-primary:hover {
            background-color: #ff3916;
            border-color: #ff3916;
        }
        .alert {
            border-radius: 4px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="login-container">
            <div class="login-header">
                <h2>Order System</h2>
                <p class="text-muted">Please sign in to continue</p>
            </div>

            <?php if ($error): ?>
                <div class="alert alert-danger">
                    <?php echo htmlspecialchars($error); ?>
                </div>
            <?php endif; ?>

            <form method="POST" action="">
                <div class="mb-3">
                    <label for="username" class="form-label">Username</label>
                    <input type="text" 
                           class="form-control" 
                           id="username" 
                           name="username" 
                           required 
                           value="<?php echo htmlspecialchars($_POST['username'] ?? ''); ?>">
                </div>
                <div class="mb-3">
                    <label for="password" class="form-label">Password</label>
                    <input type="password" 
                           class="form-control" 
                           id="password" 
                           name="password" 
                           required>
                </div>
                <button type="submit" class="btn btn-primary w-100">
                    Sign In
                </button>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html> 