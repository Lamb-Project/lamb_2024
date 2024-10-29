function showMessage(message, isError = false) {
  const popup = document.getElementById("messagePopup");
  popup.textContent = message;
  popup.style.display = "block";
  popup.className = "message-popup"; // Reset to default class

  if (isError) {
    popup.classList.add("error");
  }

  setTimeout(() => {
    popup.style.display = "none";
  }, 3000); // Message disappears after 3 seconds
}


async function submitForm() {
  const formData = new FormData();



  const collectionName = document.getElementById("collectionName").value;
  if (!collectionName) {
    showMessage("Please enter a collection name", true);
    return;
  }

  const embeddingFunction = document.getElementById("embeddingFunction").value;
  const fileInput = document.getElementById("document");
  const file = fileInput.files[0]; // Assuming single file upload


  formData.append("collectionName", collectionName);
  formData.append("embeddingFunction", embeddingFunction);
  formData.append("document", file); // Appending the file

  try {
    // show a message that the documents are being ingested and delete it after either success or failure
    const messagePopup = document.getElementById("messagePopup");
    messagePopup.textContent = "Ingesting documents... Please wait";
    messagePopup.style.display = "block";

    const response = await fetch("/chromadb/ingest", {
      method: "POST",
      body: formData, // Sending as FormData
    });

    if (response.ok) {
      const responseData = await response.json();
      console.log(responseData);
      if (responseData.success) {
        showMessage(`Success: ${JSON.stringify(responseData.message)}`);
      }else{
        showMessage(`Error: ${JSON.stringify(responseData.message)}`, true);
      }
      
    } else {
      const error = await response.json();
      showMessage(`Error: ${error.message}`, true);
    }
  } catch (error) {
    showMessage(`Error: ${error.message}`, true);
  }
}

// populate collection names
async function populateCollectionNames() {
  const collectionNames = await fetch("/chromadb/collections");
  const collectionNamesData = await collectionNames.json();
  const dataList = document.getElementById("options");

  collectionNamesData.forEach((collectionName) => {
    
    const option = document.createElement("option");
    option.value = collectionName.name;
    option.textContent = collectionName.name;
    dataList.appendChild(option);
  });
}

// onload populate collection names
document.addEventListener("DOMContentLoaded", () => {
  populateCollectionNames();
});