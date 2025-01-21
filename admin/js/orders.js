// Add this to admin/dashboard.html inside the orders section
const ordersSection = `
    <div class="row mb-4">
        <div class="col-md-4">
            <input type="text" class="form-control" id="customerSearch" placeholder="Search by customer name">
        </div>
        <div class="col">
            <button class="btn btn-secondary" id="exportOrdersBtn">Export CSV</button>
        </div>
    </div>

    <div class="table-responsive">
        <table class="table">
            <thead>
                <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Products</th>
                    <th>Total Price</th>
                    <th>Status</th>
                    <th>Order Date</th>
                </tr>
            </thead>
            <tbody id="ordersTableBody"></tbody>
        </table>
    </div>
`;

async function loadOrders(customerFilter = '') {
    try {
        let url = `https://api.airtable.com/v0/${BASE_ID}/Orders`;
        if (customerFilter) {
            url += `?filterByFormula=FIND('${customerFilter}',LOWER({customer_name}))`;
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const data = await response.json();
        displayOrders(data.records);
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

function displayOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.fields.customer_name}</td>
            <td>${order.fields.products.join(', ')}</td>
            <td>$${order.fields.total_price}</td>
            <td>${order.fields.status}</td>
            <td>${new Date(order.fields.order_date).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

function exportOrdersCSV(orders) {
    const headers = ['Order ID,Customer,Products,Total Price,Status,Order Date'];
    const csv = orders.map(order => {
        return `${order.id},${order.fields.customer_name},"${order.fields.products.join('; ')}",$${order.fields.total_price},${order.fields.status},${order.fields.order_date}`;
    });
    
    const csvContent = headers.concat(csv).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orders.csv';
    a.click();
} 