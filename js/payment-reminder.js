// Payment Reminder System

// Constants for payment terms in milliseconds
const PAYMENT_TERMS = {
    'COD': 0, // Immediate payment required
    '30 Days': 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    '60 Days': 60 * 24 * 60 * 60 * 1000  // 60 days in milliseconds
};

// Constants for reminder thresholds
const REMINDER_THRESHOLDS = {
    'COD': 0, // Remind immediately
    '30 Days': 14 * 24 * 60 * 60 * 1000, // 2 weeks (14 days) in milliseconds
    '60 Days': 42 * 24 * 60 * 60 * 1000  // 6 weeks (42 days) in milliseconds
};

// Function to check if a payment reminder should be shown
function checkPaymentReminder() {
    // Only check for regular users, not admin or sub-admin
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'user') return;
    
    const userJson = localStorage.getItem('currentUser');
    if (!userJson) return;
    
    const user = JSON.parse(userJson);
    
    // Fetch user details to get payment status and terms
    fetch(`${API_URL}/${AIRTABLE_CONFIG.TABLES.USERS}/${user.id}`, {
        headers: {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        // Check if user is already marked as paid
        if (data.fields.Paid === 'Yes') return;
        
        // Get payment terms and last order date
        const paymentTerms = data.fields.PaymentTerms || 'COD';
        
        // Get the user's orders to find the last order date
        return fetch(`${API_URL}/Orders?filterByFormula={BPCode}='${user.id}'`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_CONFIG.API_KEY}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(ordersData => {
            if (!ordersData.records || ordersData.records.length === 0) return;
            
            // Sort orders by date (most recent first)
            const orders = ordersData.records.sort((a, b) => 
                new Date(b.fields.OrderDate) - new Date(a.fields.OrderDate)
            );
            
            // Get the last order date
            const lastOrderDate = new Date(orders[0].fields.OrderDate);
            const now = new Date();
            
            // Calculate time elapsed since last order
            const timeElapsed = now.getTime() - lastOrderDate.getTime();
            
            // Get the reminder threshold based on payment terms
            const reminderThreshold = REMINDER_THRESHOLDS[paymentTerms];
            
            // Check if we should show a reminder based on the elapsed time
            if (timeElapsed >= reminderThreshold) {
                // Calculate days remaining until final payment due date
                const paymentDueDate = new Date(lastOrderDate.getTime() + PAYMENT_TERMS[paymentTerms]);
                const daysRemaining = Math.ceil((paymentDueDate - now) / (24 * 60 * 60 * 1000));
                
                // Show the payment reminder with the countdown
                showPaymentReminder(daysRemaining, paymentTerms, paymentDueDate);
            }
        });
    })
    .catch(error => {
        console.error('Error checking payment status:', error);
    });
}

// Function to show the payment reminder overlay
function showPaymentReminder(daysRemaining, paymentTerms, dueDate) {
    // Create the reminder overlay
    const overlay = document.createElement('div');
    overlay.className = 'payment-reminder-overlay';
    
    // Format the due date
    const formattedDueDate = dueDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Show "0 days" if past due
    const daysText = daysRemaining <= 0 ? '0 days' : `${daysRemaining} days`;
    
    // Determine urgency class based on days remaining
    let urgencyClass = 'normal';
    if (daysRemaining <= 7) urgencyClass = 'urgent';
    if (daysRemaining <= 3) urgencyClass = 'critical';
    if (daysRemaining <= 0) urgencyClass = 'overdue';
    
    overlay.innerHTML = `
        <div class="payment-reminder ${urgencyClass}">
            <div class="reminder-close">&times;</div>
            <div class="reminder-icon">⚠️</div>
            <h2>Payment Reminder</h2>
            <p>Your account has unpaid orders that require attention.</p>
            <div class="countdown">
                <div class="countdown-value">${daysText}</div>
                <div class="countdown-label">remaining until payment due</div>
            </div>
            <p>Payment is due by: <strong>${formattedDueDate}</strong></p>
            <p class="warning-message">Your account may be temporarily suspended if payment is not received by the due date.</p>
            <button class="btn btn-primary reminder-btn">I'll Pay Now</button>
        </div>
    `;
    
    // Add the overlay to the body
    document.body.appendChild(overlay);
    
    // Add event listener to close button
    const closeBtn = overlay.querySelector('.reminder-close');
    closeBtn.addEventListener('click', function() {
        overlay.remove();
    });
    
    // Add event listener to "I'll Pay Now" button
    const actionBtn = overlay.querySelector('.reminder-btn');
    actionBtn.addEventListener('click', function() {
        // Here you would implement payment functionality
        // For now, just close the overlay
        overlay.remove();
        
        // Show a notification
        showNotification('Please contact customer support to process your payment.', 'info');
    });
}

// Check for payment reminders when the page loads (in customer portal)
if (window.location.pathname.includes('/customer/')) {
    document.addEventListener('DOMContentLoaded', checkPaymentReminder);
} 