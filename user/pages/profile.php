<?php
if (!defined('BASEPATH')) {
    exit('No direct script access allowed');
}

$success_message = '';
$error_message = '';

try {
    // Get current user data
    $response = callAirtableAPI('Users', 'GET', null, [
        'filterByFormula' => "{Username}='" . addslashes($_SESSION['username']) . "'"
    ]);
    
    if (!empty($response['records'])) {
        $userData = $response['records'][0];
        $recordId = $userData['id'];
        
        // Handle form submission
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Validate inputs
            $newUsername = trim($_POST['username'] ?? '');
            $newPassword = trim($_POST['password'] ?? '');
            $confirmPassword = trim($_POST['confirm_password'] ?? '');
            
            if (empty($newUsername)) {
                $error_message = "Username cannot be empty";
            } elseif (!empty($newPassword) && $newPassword !== $confirmPassword) {
                $error_message = "Passwords do not match";
            } else {
                // Prepare fields for update
                $updateFields = [];
                $updateFields['Username'] = $newUsername;
                $updateFields['CustomerID'] = $userData['fields']['CustomerID'];
                
                // Only include password if it's being changed
                if (!empty($newPassword)) {
                    $updateFields['Password'] = password_hash($newPassword, PASSWORD_DEFAULT);
                }

                // Debug log
                error_log("Update Fields: " . print_r($updateFields, true));

                // Make the update request
                $updateResponse = callAirtableAPI(
                    'Users',
                    'PATCH',
                    $recordId,
                    null,
                    $updateFields
                );
                
                // Debug log
                error_log("Update Response: " . print_r($updateResponse, true));
                
                if (isset($updateResponse['id'])) {
                    $_SESSION['username'] = $newUsername;
                    $success_message = "Profile updated successfully!";
                    $userData = $updateResponse;
                } else {
                    $error_message = "Failed to update profile. Please try again.";
                    error_log("Airtable Update Error: " . print_r($updateResponse, true));
                }
            }
        }
    } else {
        $error_message = "User not found.";
    }
} catch (Exception $e) {
    $error_message = "An error occurred: " . $e->getMessage();
    error_log("Profile Update Error: " . $e->getMessage());
}
?>

<div class="container-fluid">
    <div class="row justify-content-center">
        <div class="col-xl-8 col-lg-10">
            <div class="card shadow mb-4">
                <div class="card-header py-3">
                    <h6 class="m-0 font-weight-bold text-primary">My Profile</h6>
                </div>
                <div class="card-body">
                    <?php if ($success_message): ?>
                        <div class="alert alert-success">
                            <?php echo htmlspecialchars($success_message); ?>
                        </div>
                    <?php endif; ?>
                    
                    <?php if ($error_message): ?>
                        <div class="alert alert-danger">
                            <?php echo htmlspecialchars($error_message); ?>
                        </div>
                    <?php endif; ?>

                    <form method="POST" action="" class="user">
                        <div class="form-group mb-4">
                            <label for="username">Username</label>
                            <input type="text" 
                                   class="form-control" 
                                   id="username" 
                                   name="username" 
                                   value="<?php echo htmlspecialchars($userData['fields']['Username'] ?? ''); ?>"
                                   required>
                        </div>

                        <div class="form-group mb-4">
                            <label for="password">New Password (leave blank to keep current)</label>
                            <input type="password" 
                                   class="form-control" 
                                   id="password" 
                                   name="password"
                                   autocomplete="new-password">
                        </div>

                        <div class="form-group mb-4">
                            <label for="confirm_password">Confirm New Password</label>
                            <input type="password" 
                                   class="form-control" 
                                   id="confirm_password" 
                                   name="confirm_password">
                        </div>

                        <button type="submit" class="btn btn-primary">
                            Update Profile
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form.user');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');

    form.addEventListener('submit', function(e) {
        if (password.value || confirmPassword.value) {
            if (password.value !== confirmPassword.value) {
                e.preventDefault();
                alert('Passwords do not match!');
            }
        }
    });
});
</script> 