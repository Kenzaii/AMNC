<div class="card shadow mb-4">
    <div class="card-header py-3 d-flex justify-content-between align-items-center">
        <h6 class="m-0 font-weight-bold text-primary">Products</h6>
        <button class="btn btn-primary btn-sm" data-toggle="modal" data-target="#addProductModal">Add Product</button>
    </div>
    <div class="card-body">
        <div class="table-responsive">
            <table class="table table-bordered" id="productsTable">
                <thead>
                    <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Assigned Customers</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    if ($pageData && isset($pageData['records'])) {
                        foreach ($pageData['records'] as $record) {
                            $fields = $record['fields'];
                            echo "<tr>";
                            echo "<td>";
                            if (isset($fields['ImageURL']) && !empty($fields['ImageURL'])) {
                                echo "<img src='" . htmlspecialchars($fields['ImageURL']) . "' width='50' height='50' style='object-fit: cover;'>";
                            } else {
                                echo "<img src='assets/img/no-image.png' width='50' height='50' style='object-fit: cover;'>"; // Default image
                            }
                            echo "</td>";
                            echo "<td>" . htmlspecialchars($fields['Name'] ?? '') . "</td>";
                            echo "<td>" . htmlspecialchars($fields['Descriptions'] ?? '') . "</td>";
                            echo "<td>$" . number_format($fields['Price'] ?? 0, 2) . "</td>";
                            echo "<td>" . htmlspecialchars(implode(', ', $fields['AssignedCustomerIDs'] ?? [])) . "</td>";
                            echo "<td>
                                    <button class='btn btn-sm btn-info edit-product' data-id='" . $record['id'] . "'>
                                        <i class='fas fa-edit'></i> Edit
                                    </button>
                                    <button class='btn btn-sm btn-danger delete-product' data-id='" . $record['id'] . "'>
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