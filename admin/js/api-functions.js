// API Functions for admin dashboard

// Order Management Functions
async function updateOrderStatus(orderId) {
    try {
        const status = prompt('Enter new status (Pending/Processing/Completed/Cancelled):');
        if (!status) return;

        const response = await fetch('api/handlers.php?action=updateOrderStatus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId, status })
        });

        const data = await response.json();
        if (data.success) {
            alert('Order status updated successfully');
            loadOrders();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error updating order:', error);
        alert('Error updating order status');
    }
}

// Account Management Functions
async function toggleAccountStatus(userId, isDisabled) {
    try {
        const response = await fetch('api/handlers.php?action=toggleAccountStatus', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, isDisabled })
        });

        const data = await response.json();
        if (data.success) {
            alert(`Account ${isDisabled ? 'disabled' : 'enabled'} successfully`);
            loadAccounts();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error toggling account status:', error);
        alert('Error updating account status');
    }
}

// Announcement Functions
async function saveAnnouncement() {
    try {
        const title = document.getElementById('announcementTitle').value;
        const message = document.getElementById('announcementMessage').value;
        const priority = document.getElementById('announcementPriority').value;

        const fields = {
            Title: title,
            Message: message,
            Priority: priority,
            CreatedTime: new Date().toISOString()
        };

        const response = await fetch('api/handlers.php?action=saveAnnouncement', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: currentAnnouncementId,
                fields
            })
        });

        const data = await response.json();
        if (data.success) {
            alert('Announcement saved successfully');
            $('#announcementModal').modal('hide');
            loadAnnouncements();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error saving announcement:', error);
        alert('Error saving announcement');
    }
}

function showAddAnnouncementForm() {
    currentAnnouncementId = null;
    document.getElementById('modalTitle').textContent = 'New Announcement';
    document.getElementById('announcementForm').reset();
    $('#announcementModal').modal('show');
}

async function editAnnouncement(id) {
    try {
        const response = await fetch(`${AIRTABLE_URL}/${BASE_ID}/Announcements/${id}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        
        const data = await response.json();
        currentAnnouncementId = id;
        
        document.getElementById('modalTitle').textContent = 'Edit Announcement';
        document.getElementById('announcementTitle').value = data.fields.Title || '';
        document.getElementById('announcementMessage').value = data.fields.Message || '';
        document.getElementById('announcementPriority').value = data.fields.Priority || 'Low';
        
        $('#announcementModal').modal('show');
    } catch (error) {
        console.error('Error loading announcement:', error);
        alert('Error loading announcement details');
    }
} 