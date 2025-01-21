<?php
if (!defined('BASE_ID')) {
    exit('Direct script access denied.');
}
?>

<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold text-primary">User Accounts</h6>
            <button class="btn btn-primary btn-sm" data-toggle="modal" data-target="#addUserModal">Add User</button>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered" id="usersTable">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Customer ID</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        if ($pageData && isset($pageData['records'])) {
                            foreach ($pageData['records'] as $record) {
                                $fields = $record['fields'];
                                echo "<tr>";
                                echo "<td>" . htmlspecialchars($fields['Username'] ?? '') . "</td>";
                                echo "<td>" . htmlspecialchars($fields['Role'] ?? '') . "</td>";
                                echo "<td>" . htmlspecialchars($fields['CustomerID'] ?? '') . "</td>";
                                echo "<td>
                                        <button class='btn btn-sm btn-info edit-user' data-id='" . $record['id'] . "'>
                                            <i class='fas fa-edit'></i> Edit
                                        </button>
                                        <button class='btn btn-sm btn-danger delete-user' data-id='" . $record['id'] . "'>
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
</div> 