<?php
if (!defined('BASE_ID')) {
    exit('Direct script access denied.');
}
?>

<div class="container-fluid">
    <div class="card shadow mb-4">
        <div class="card-header py-3 d-flex justify-content-between align-items-center">
            <h6 class="m-0 font-weight-bold text-primary">Announcements</h6>
            <button class="btn btn-primary btn-sm" data-toggle="modal" data-target="#addAnnouncementModal">Add Announcement</button>
        </div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-bordered" id="announcementsTable">
                    <thead>
                        <tr>
                            <th>Info</th>
                            <th>Promotion</th>
                            <th>Warning</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        if ($pageData && isset($pageData['records'])) {
                            foreach ($pageData['records'] as $record) {
                                $fields = $record['fields'];
                                echo "<tr>";
                                echo "<td>" . htmlspecialchars($fields['Info'] ?? '') . "</td>";
                                echo "<td>" . htmlspecialchars($fields['Promotion'] ?? '') . "</td>";
                                echo "<td>" . htmlspecialchars($fields['Warning'] ?? '') . "</td>";
                                echo "<td><span class='badge badge-" . ($fields['Active'] ? 'success' : 'secondary') . "'>" 
                                     . ($fields['Active'] ? 'Active' : 'Inactive') . "</span></td>";
                                echo "<td>
                                        <button class='btn btn-sm btn-info edit-announcement' data-id='" . $record['id'] . "'>
                                            <i class='fas fa-edit'></i> Edit
                                        </button>
                                        <button class='btn btn-sm btn-danger delete-announcement' data-id='" . $record['id'] . "'>
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

<!-- Add Announcement Modal -->
<div class="modal fade" id="addAnnouncementModal" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Add New Announcement</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <form id="announcementForm">
                    <div class="form-group">
                        <label>Info</label>
                        <input type="text" class="form-control" name="info" required>
                    </div>
                    <div class="form-group">
                        <label>Promotion</label>
                        <input type="text" class="form-control" name="promotion">
                    </div>
                    <div class="form-group">
                        <label>Warning</label>
                        <input type="text" class="form-control" name="warning">
                    </div>
                    <div class="form-group">
                        <div class="custom-control custom-switch">
                            <input type="checkbox" class="custom-control-input" id="activeStatus" name="active">
                            <label class="custom-control-label" for="activeStatus">Active</label>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="saveAnnouncement">Save</button>
            </div>
        </div>
    </div>
</div> 