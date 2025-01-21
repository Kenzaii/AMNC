// Add this to admin/dashboard.html inside the products section
const productsSection = `
    <div class="row mb-4">
        <div class="col">
            <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addProductModal">
                Add New Product
            </button>
        </div>
    </div>

    <div class="table-responsive">
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Price</th>
                    <th>Customers</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="productsTableBody"></tbody>
        </table>
    </div>

    <!-- Add Product Modal -->
    <div class="modal fade" id="addProductModal">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Add New Product</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="addProductForm">
                        <div class="mb-3">
                            <label class="form-label">Name</label>
                            <input type="text" class="form-control" name="name" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Description</label>
                            <textarea class="form-control" name="description" required></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Price</label>
                            <input type="number" class="form-control" name="price" step="0.01" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Customers</label>
                            <select class="form-select" name="customers" multiple required>
                                <!-- Will be populated dynamically -->
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary">Add Product</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
`;

async function loadProducts() {
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/Products`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const data = await response.json();
        displayProducts(data.records);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function displayProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = products.map(product => `
        <tr>
            <td>${product.fields.name}</td>
            <td>${product.fields.description}</td>
            <td>$${product.fields.price}</td>
            <td>${product.fields.customer_ids ? product.fields.customer_ids.join(', ') : ''}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editProduct('${product.id}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteProduct('${product.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
} 