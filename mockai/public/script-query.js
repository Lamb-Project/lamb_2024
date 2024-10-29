document.addEventListener('DOMContentLoaded', () => {

    // populate the collection dropdown
    const collectionDropdown = document.getElementById('collectionName');
    if(collectionDropdown) {
        fetch('/chromadb/collections')
        .then(response => response.json())
        .then(data => {
            data.forEach(collection => {
                const option = document.createElement('option');
                option.value = collection.name;
                option.textContent = collection.name;
                collectionDropdown.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }

    const submitButton =document.getElementById('sendQueryButton');
    if(submitButton) {
        // Replace the inline onclick event to prevent inline JavaScript execution.
        submitButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent the default form submit action
            submitForm();
        });
    }

    const queryField = document.getElementById('query');
    if(queryField) {
        queryField.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') { // If the user presses the Enter key
                submitForm();
            }
        });
    }

    
});

function submitForm() {
    // Get the form data
    const action = document.getElementById('action').value;
    const collectionName = document.getElementById('collectionName').value;
    const query = document.getElementById('query').value;

    // Construct the JSON payload to send
    const jsonData = {
        action: action,
        collectionName: collectionName,
        query: query
    };

    // Send the request
    fetch('/chromadb/query', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // This header tells the server to expect JSON
        },
        body: JSON.stringify(jsonData) // Convert the JavaScript object to a JSON string
    })
    .then(response => response.json()) // Assuming the server responds with JSON
    .then(data => {
        // Display the result
        const messageElement = document.getElementById('message');
        messageElement.textContent = JSON.stringify(data, null, 2); // Convert JSON data to a string for display
    })
    .catch(error => {
        // Handle any errors
        console.error('Error:', error);
        const messageElement = document.getElementById('message');
        messageElement.textContent = `Error: ${error}`;
    });
}

