// Airtable Configuration
const AIRTABLE_CONFIG = {
    API_KEY: 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542',
    BASE_ID: 'appipp8LFUGElp3Di',
    TABLES: {
        PRODUCTS: 'Products',
        ORDERS: 'Orders',
        CUSTOMERS: 'Customers',
        USERS: 'Users'
    }
};

// Initialize Airtable base and export configuration
window.AIRTABLE_CONFIG = AIRTABLE_CONFIG;
window.base = new Airtable({ apiKey: AIRTABLE_CONFIG.API_KEY }).base(AIRTABLE_CONFIG.BASE_ID); 