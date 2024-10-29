async function loadCollections() {
  try {
    const response = await fetch("/chromadb/collections", { method: "GET" });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const collections = await response.json();
    const select = document.getElementById("collection");
    collections.forEach((collection) => {
      const option = document.createElement("option");
      option.value = collection.name;
      option.textContent = `${collection.name} (${collection.count})`;
      select.appendChild(option);
    });

    // get chromadb/embeddingFunction json data
    const responseEmbeddingFunctions = await fetch(
      "/chromadb/embeddingFunctions"
    );
    const collectionsFunctions = await responseEmbeddingFunctions.json();
    console.log("Collections and functions:", collectionsFunctions.data);
    // get collection names that are not in the collectionsFunctions
    const collectionNames = collections.map((collection) => collection.name);
    const collectionsWithoutFunctions = collectionNames.filter(
      (collection) =>
        !collectionsFunctions.data.some(
          (collectionFunction) => collectionFunction.collection === collection
        )
    );
    if (collectionsWithoutFunctions.length > 0) {
      console.log(
        "Collections without functions:",
        collectionsWithoutFunctions
      );
      document.getElementById(
        "message"
      ).textContent = `You should remove these collections without defined embeddingFunctions: ${collectionsWithoutFunctions.join(
        ", "
      )}`;
    }

    // print selected collection count in console
    
    if (select.options.length > 0) {    
      console.log("Selected collection count: ", select.selectedOptions[0].value);
    }
  } catch (error) {
    console.error("Could not load collections:", error);
    document.getElementById(
      "message"
    ).textContent = `Error loading collections: ${error.message}`;
  }
}

function displayData(jsonData) {
  const peekDiv = document.getElementById("peek");
  let htmlContent = "";

  // Displaying IDs
  htmlContent += "<h3>IDs</h3><ul>";
  jsonData.ids.forEach((id) => {
    htmlContent += `<li>${id}</li>`;
  });
  htmlContent += "</ul>";

  // Displaying metadatas
  htmlContent += "<h3>Metadatas</h3>";

  // html content collapser
  jsonData.metadatas.forEach((metadata) => {
    htmlContent += "<details><summary>Document Metadata</summary>";
    htmlContent += "<ul>";
    // for each key of metadata object, add a list item with the key and value
    for (let key in metadata) {
      htmlContent += `<li>${key}: ${metadata[key]}</li>`;
    }
    htmlContent += "</ul>";
    htmlContent += "</details>";
  });

  // Displaying documents
  htmlContent += "<h3>Documents</h3><ul>";
  jsonData.documents.forEach((document) => {
    htmlContent += `<li>${document}</li>`;
  });
  htmlContent += "</ul>";

  // Setting the innerHTML of the peekDiv to the htmlContent
  peekDiv.innerHTML = htmlContent;
}

async function initialize() {
  // Add event listener to the delete button
  document
    .getElementById("deleteButton")
    .addEventListener("click", async () => {
      // confirm if the user wants to delete the collection
      if (!confirm("Are you sure you want to delete this collection?")) {
        return;
      }

      const collection =
        document.getElementById("collection").selectedOptions[0].value;

      try {
        const response = await fetch(`/chromadb/collections/${collection}`, {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // show a message that the collection was deleted and delete message after 5 seconds
        document.getElementById(
          "message"
        ).textContent = `Collection ${collection} deleted`;
        setTimeout(() => {
          document.getElementById("message").textContent = "";
        }, 5000);

        // remove the collection from the select element
        document
          .getElementById("collection")
          .remove(document.getElementById("collection").selectedIndex);
      } catch (error) {
        console.error("Could not delete collection:", error);
        document.getElementById(
          "message"
        ).textContent = `Error deleting collection: ${error.message}`;
      }
    });

  document.getElementById("peekButton").addEventListener("click", async () => {
    const collection =
      document.getElementById("collection").selectedOptions[0].value;

    const howmany = document.getElementById("howmany").value;

    try {
      const response = await fetch(`/chromadb/collections/${collection}/${howmany}`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const peek = await response.json();

      displayData(peek);
    } catch (error) {
      console.error("Could not peek collection:", error);
      document.getElementById(
        "message"
      ).textContent = `Error peeking collection: ${error.message}`;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initialize();
  loadCollections();
});
