document.addEventListener('DOMContentLoaded', function () {
    /* 
    const librarySelector = document.getElementById('libraryName');
    librarySelector.addEventListener('change', function() {
        if (this.value) {
            fetchFiles(this.value);
        }
    });
    */
    fetchLibraries();
});

async function fetchLibraries() {
    try {
        const response = await fetch('/util/libraries');
        if (!response.ok) {
            console.error("Failed to fetch libraries:", response.status, response.statusText);
            return;  // Exit the function if the response is not OK
        }
        const data = await response.json();
        const librarySelect = document.getElementById('libraryName');
        if (data.libraries && data.libraries.length > 0) {
            data.libraries.forEach(lib => {
                const option = new Option(lib, lib);
                librarySelect.appendChild(option);
            });
        } else {
            console.log("No libraries available or empty array returned.");
        }
    } catch (error) {
        console.error("Error fetching libraries:", error);
    }
}
/*/
async function fetchFiles(libraryName) {
    const response = await fetch(`/util/library-files/${libraryName}`);
    const fileTableContainer = document.getElementById('fileTableContainer');
    fileTableContainer.innerHTML = ''; // Clear current table

    if (response.ok) {
        const files = await response.json();
        const table = document.createElement('table');
        table.innerHTML = `<tr><th>Title</th><th>PDF Link</th><th>JSON Link</th></tr>`;
        files.forEach(file => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${file.title}</td>
                            <td><a href="${file.pdfUrl}" target="_blank">View PDF</a></td>
                            <td><a href="${file.jsonUrl}" target="_blank">Download JSON</a></td>`;
            table.appendChild(tr);
        });
        fileTableContainer.appendChild(table);
    } else {
        console.error('Failed to fetch files:', response.statusText);
        fileTableContainer.innerHTML = '<p>Failed to load files.</p>';
    }
}
/*/


document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Stop the form from submitting normally
    var formData = new FormData(this); // Use the form's elements
    // Add the library name to the form data
    var libraryName = document.getElementById('libraryName').value;

    fetch('/util/pre-ingest?libraryName=' + libraryName , { // Post to your API endpoint
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        document.getElementById('downloadLinks').innerHTML = 'Success! File uploaded.';
    })
    .catch((error) => {
        console.error('Error:', error);
        document.getElementById('downloadLinks').innerHTML = 'Error! File not uploaded.';
    });
});

