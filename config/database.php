<?php
// Airtable API Configuration
define('AIRTABLE_URL', 'https://api.airtable.com/v0');
define('BASE_ID', 'appipp8LFUGElp3Di');
define('API_KEY', 'pathhm43xpa5TmwaG.3b6a259e92f40f97170ba1680a4db0af5c767076db223aef553ae844cf94e542');

// Helper function for API calls
function callAirtableAPI($endpoint, $method = 'GET', $data = null, $params = []) {
    try {
        $url = AIRTABLE_URL . '/' . BASE_ID . '/' . $endpoint;
        
        // Add query parameters if any
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        error_log("Making API call to: " . $url);

        $ch = curl_init($url);
        
        $headers = [
            'Authorization: Bearer ' . API_KEY,
            'Content-Type: application/json'
        ];

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For testing only
        
        if ($method !== 'GET') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            if ($data) {
                $jsonData = json_encode($data);
                curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);
                error_log("Sending data: " . $jsonData);
            }
        }

        $response = curl_exec($ch);
        
        if (curl_errno($ch)) {
            throw new Exception('Curl error: ' . curl_error($ch));
        }
        
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        error_log("API Response Code: " . $httpCode);
        error_log("API Response: " . $response);

        if ($httpCode >= 200 && $httpCode < 300) {
            return json_decode($response, true);
        } else {
            throw new Exception("API call failed with status $httpCode: " . $response);
        }
    } catch (Exception $e) {
        error_log("API Error: " . $e->getMessage());
        throw $e;
    }
}

// Test the connection
try {
    error_log("Testing Airtable connection...");
    $test = callAirtableAPI('Users', 'GET', null, ['maxRecords' => 1]);
    error_log("Connection test successful. Response: " . print_r($test, true));
} catch (Exception $e) {
    error_log("Connection test failed: " . $e->getMessage());
    die("Airtable connection failed: " . $e->getMessage());
}
?> 