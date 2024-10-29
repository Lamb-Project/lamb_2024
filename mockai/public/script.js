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


async function fetchModels() {
  try {
    const response = await fetch("/v1/models");
    if (!response.ok) throw new Error("Failed to fetch models");

    const data = await response.json();
    populateTable(data.data);

    // get collection names and embedding functions from collections sqlite table
    // fetch collections from /chromadb/embeddingFunctions
    const responseCollections = await fetch("/chromadb/embeddingFunctions");
    const collectionsFunctions = await responseCollections.json();

    console.log("Collections and functions:", collectionsFunctions.data);

    // Create the collectionDependencies object dynamically
    const collectionDependencies = collectionsFunctions.data.reduce(
      (acc, model) => {
        // Assuming 'collection' is unique and its combination with vectorDB and embedding is consistent
        acc[model.collection] = {
          vectorDB: "chromadb" /*model.vectorDB*/,
          embeddingFunction: model.embeddingFunction,
        };
        return acc;
      },
      {}
    );

    console.log("Collection dependencies:", collectionDependencies);

    // Update form fields based on collection selection
    updateFormFieldsBasedOnCollection(collectionDependencies);
  } catch (error) {
    console.error("Error fetching models:", error);
  }
}

function updateFormFieldsBasedOnCollection(collectionDependencies) {
  const collectionSelect = document.getElementById("collection");
  const vectorDBSelect = document.getElementById("vectorDB");
  const embeddingFunctionSelect = document.getElementById("embeddingFunction");

  vectorDBSelect.disabled = true;
  embeddingFunctionSelect.disabled = true;

  collectionSelect.addEventListener("change", function () {
    const selectedCollection = collectionSelect.value;
    const dependencies = collectionDependencies[selectedCollection];
    console.log("Selected dependencies:", dependencies);
    if (dependencies) {
      vectorDBSelect.value = dependencies.vectorDB;
      // Assuming embeddingFunctionSelect is the correct ID for the embedding function select element
      embeddingFunctionSelect.value = dependencies.embeddingFunction;
    }
  });
}

function fetchCollections() {
  fetch("/api/collections")
    .then((response) => response.json())
    .then((collections) => {
      const collectionSelect = document.getElementById("collection");
      collectionSelect.add(new Option("Select a collection", ""));
      collections.forEach((collection) => {
        let option = new Option(collection.name, collection.name);
        collectionSelect.add(option);
      });
    })
    .catch((error) => console.error("Error fetching collections:", error));
}

function populateTable(models) {
  const tableBody = document
    .getElementById("modelsTable")
    .getElementsByTagName("tbody")[0];
  tableBody.innerHTML = ""; // Clear existing rows

  models.forEach((model) => {
    let row = tableBody.insertRow();

    let actionCell = row.insertCell(0);
    actionCell.innerHTML = `<span class="delete-icon" data-id="${model.id}">❌</span> <span class="edit-icon" data-id="${model.id}"> 📝 </span> `;

    let cellModelId = row.insertCell(1);
    cellModelId.textContent = model.id;

    let cellVectorDB = row.insertCell(2);
    cellVectorDB.textContent = model.vectorDB;

    let cellCollection = row.insertCell(3);
    cellCollection.textContent = model.collection;

    let cellEmbedding = row.insertCell(4);
    cellEmbedding.textContent = model.embedding;

    let cellPromptTemplate = row.insertCell(5);
    cellPromptTemplate.textContent = model.promptTemplate;

    let cellSystemPrompt = row.insertCell(6);
    // ellipsis to truncate long text
    cellSystemPrompt.style.maxWidth = "400px";
    cellSystemPrompt.style.overflow = "hidden";
    cellSystemPrompt.style.textOverflow = "ellipsis";
    cellSystemPrompt.textContent = model.systemPrompt;
    // show full text on hover
    cellSystemPrompt.title = model.systemPrompt;

    let cellTopK = row.insertCell(7);
    cellTopK.textContent = model.topK;

    let cellAugmentation = row.insertCell(8);
    cellAugmentation.textContent = model.augmentation;

    let cellLLM = row.insertCell(9);
    cellLLM.textContent = model.llm;

  });
}

function fetchAugmentations() {
  fetch("/v1/augmentations")
    .then((response) => response.json())
    .then((augmentations) => {
      const augmentationSelect = document.getElementById("augmentation");
      augmentationSelect.add(new Option("Select an augmentation", ""));
      augmentations.data.forEach((augmentation) => {
        if (augmentation.name != "util") {
          let option = new Option(augmentation.name, augmentation.name);
          augmentationSelect.add(option);
        }
      });
    })
    .catch((error) => console.error("Error fetching augmentations:", error));
}

document.addEventListener("DOMContentLoaded", function () {
  fetchModels();
  fetchCollections();
  fetchAugmentations();

  const form = document.getElementById("modelForm");

  form.addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission

    // enable disabled fields before submitting
    const vectorDBSelect = document.getElementById("vectorDB");
    const embeddingFunctionSelect = document.getElementById("embeddingFunction");
    vectorDBSelect.disabled = false;
    embeddingFunctionSelect.disabled = false;

    const formData = new FormData(form);
    // Convert FormData to JSON
    const formDataJson = Object.fromEntries(formData.entries());

    // Submit form data
    submitModelForm(JSON.stringify(formDataJson));
  });

  function submitModelForm(formDataJson) {
    fetch("/v1/models", {
      method: "POST",
      body: formDataJson,
      headers: {
        "Content-Type": "application/json",
      },
    })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 409) {
          // Handle unique constraint failure (duplicate model)
          return response.text().then((text) => Promise.reject(text));
        } else {
          // Handle other errors
          return Promise.reject("An error occurred while adding the model.");
        }
      }
      return response.text();
    })
    .then((text) => {
      showMessage("Learning Assistant successfully edited/added");
      fetchModels();
    })
    .catch((error) => {
      showMessage(error, true);
    });
  }

  function deleteModel(modelId, deleteIcon) {
    console.log("Deleting model:", modelId);

    // Are you sure prompt
    if (!confirm("Are you sure you want to delete this model?")) {
      return;
    }

    fetch(`/v1/models/${encodeURIComponent(modelId)}`, {
      method: "DELETE",
    })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Remove the row from the table
        let row = deleteIcon.parentNode.parentNode;
        row.parentNode.removeChild(row);
        showMessage("Model deleted successfully");
      } else {
        showMessage("Failed to delete model", true);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showMessage(error, true);
    });
  }

  document.getElementById("modelsTable").addEventListener("click", function (event) {
    if (event.target.classList.contains("delete-icon")) {
      const modelId = event.target.getAttribute("data-id");
      deleteModel(modelId, event.target);
    }
  });

  document.getElementById("modelsTable").addEventListener("click", function (event) {
    if (event.target.classList.contains("edit-icon")) {
      document.getElementById("addModelButton").textContent = "Update Model";
      const modelId = event.target.getAttribute("data-id");
      editModel(modelId, event.target);
    }
  });

  function editModel(modelId, editIcon) {
    console.log("Editing model:", modelId);
    fetch(`/v1/models/${encodeURIComponent(modelId)}`, {
      method: "GET",
    })
    .then((response) => response.json())
    .then((data) => {
      if (data.data.length > 0) {
        // Populate the form with the model data
        const model = data.data[0];
        console.log("Model data:", model);
        const form = document.getElementById("modelForm");

        form.elements["modelID"].value = model.id;
        form.elements["apiKey"].value = model.apiKey; // New API Key field
        form.elements["vectorDB"].value = model.vectorDB;
        form.elements["collection"].value = model.collection;

        form.elements["embeddingFunction"].add(new Option(model.embedding, model.embedding));
        form.elements["embeddingFunction"].value = model.embedding;

        form.elements["promptTemplate"].value = model.promptTemplate;
        form.elements["systemPrompt"].value = model.systemPrompt;
        form.elements["topK"].value = model.topK;
        form.elements["augmentation"].value = model.augmentation;
        form.elements["llm"].value = model.llm;
      } else {
        showMessage("Failed to fetch model data", true);
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      showMessage(error, true);
    });
  }
});