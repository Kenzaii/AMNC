// AirTable API Configuration
const AIRTABLE_CONFIG = {
    API_KEY: "pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542",
    BASE_ID: "appipp8LFUGElp3Di",
    TABLES: {
        USERS: "Users",
        GUEST_LOGIN: "GuestLogin",
        ACCESS_LOGS: "AccessLogs",
        PRODUCTS: "Products",
        ORDERS: "Orders",
        ORDER_ITEMS: "OrderItems"
    }
};

// API endpoints
const API_URL = `https://api.airtable.com/v0/${AIRTABLE_CONFIG.BASE_ID}`; 