<?php

// The data you want to send via POST
$data = [
    'name' => 'YourName', // Replace 'YourName' with the actual user name
    'email' => 'your.email@example.com', // Replace with the actual email
    'password' => 'yourPassword' // Replace 'yourPassword' with the actual password
];

// The JSON encoded form data
$jsonData = json_encode($data);

// API URL to make the request to
$url = 'http://127.0.0.1:8080/signup';

// Initialize cURL session
$ch = curl_init($url);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true); // Capture header information
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonData);

// Execute the POST request
$response = curl_exec($ch);

// Get the HTTP status code
$httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

// Check for cURL errors
if(curl_errno($ch)){
    echo "cURL Error: " . curl_error($ch);
}

// Close cURL session
curl_close($ch);

// Separate headers and body
list($headers, $body) = explode("\r\n\r\n", $response, 2);

// Decode the JSON body
$responseData = json_decode($body, true);

// Check if the request was successful
if ($responseData && isset($responseData['token'])) {
    echo "Signup successful! Token: " . $responseData['token'];
} else {
    echo "Signup failed.\n";
    echo "HTTP Status Code: " . $httpcode . "\n";
    // Display error message from the API if available
    if (isset($responseData['error'])) {
        echo "Error: " . $responseData['error'] . "\n";
    } else {
        echo "No error message returned from API.\n";
    }
}

// Optionally, you can further process the response data or handle errors as needed.
?>

