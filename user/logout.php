<?php
session_start();

// Clear all session variables
$_SESSION = array();

// Destroy the session
session_destroy();

// Simple redirect to the login page using absolute path from web root
header("Location: /OrderSys-main/login.php");
exit(); 