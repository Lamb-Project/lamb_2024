const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();

const { OpenAIEmbeddingFunction } = require("chromadb");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const fs = require("fs");
const unzipper = require("unzipper"); // Ensure you have this package installed
const path = require("path");
const bcrypt = require("bcrypt");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable not set");
}

const upload = multer({ dest: "uploads/" });

const {
  client,
  createMissingTables,
  ensureAuthenticated,
  createAdminIfNotExists,
} = require("./utils");

const model_db_path = process.env.MODEL_DB_PATH || "models.db";
const db = new sqlite3.Database(model_db_path);

// Create the tables if they don't exist
createAdminIfNotExists(db);
createMissingTables(db);

router.delete("/v1/models/:id", ensureAuthenticated, (req, res) => {
  const { id } = req.params;
  // delete from models and presets table
  const sqlModels = "DELETE FROM models WHERE id = ?";
  const sqlPresets = "DELETE FROM presets WHERE modelId = ?";
  db.run(sqlModels, [id], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }

    db.run(sqlPresets, [id], function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Internal Server Error");
        return;
      }
      res.json({ success: true, message: "Model deleted successfully" });
    });
  });
});

router.post("/v1/models", ensureAuthenticated, (req, res) => {
  const {
    vectorDB,
    collection,
    embeddingFunction,
    promptTemplate,
    systemPrompt,
    modelID,
    topK,
    augmentation,
    llm,
    apiKey, // New API Key field
  } = req.body;
  const modelId = `${modelID}`;
  const type = "text"; // Static value
  const maxTokens = 4096; // Static value
  const created = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

  const sqlModels = `INSERT OR REPLACE INTO models (id, object, created, type, max_tokens, owner, permissions)
                      VALUES (?, 'model', ?, ?, ?, 'llmentor', 'read,write')`;

  db.run(sqlModels, [modelId, created, type, maxTokens], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed: models.id")) {
        res
          .status(409)
          .send(
            "A model with the same ID already exists. Please choose different values."
          );
      } else {
        console.error(err.message);
        res.status(500).send("Internal Server Error");
      }
      return;
    }

    // If models insert is successful, proceed to insert into presets table
    const sqlPresets = `INSERT OR REPLACE INTO presets
                        (modelId, vectorDB, collection, embedding, promptTemplate, systemPrompt, topK, augmentation, llm, apiKey)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(
      sqlPresets,
      [
        modelId,
        vectorDB,
        collection,
        embeddingFunction,
        promptTemplate,
        systemPrompt,
        topK,
        augmentation,
        llm,
        apiKey, // Include API Key in insertion values
      ],
      function (err) {
        if (err) {
          console.error(err.message);
          res.status(500).send("Error while adding to presets table");
          return;
        }
        res.send("Model and presets added successfully");
      }
    );
  });
});

router.get("/v1/models/:id", (req, res) => {
  const { id } = req.params;

  let sql = `SELECT m.id, m.type, m.max_tokens, p.vectorDB, p.collection, p.embedding AS embedding,
                    p.promptTemplate, p.systemPrompt, p.topK, p.augmentation, p.llm, p.apiKey
             FROM models m
             JOIN presets p ON m.id = p.modelId
             WHERE m.id = ?`;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }

    console.log("Rows:", rows);

    // Transform rows to include all the fields you're selecting
    const data = rows.map((row) => {
      return {
        id: row.id,
        type: row.type,
        max_tokens: row.max_tokens,
        vectorDB: row.vectorDB,
        collection: row.collection,
        embedding: row.embedding,
        promptTemplate: row.promptTemplate,
        systemPrompt: row.systemPrompt,
        topK: row.topK,
        augmentation: row.augmentation,
        llm: row.llm,
        apiKey: row.apiKey, // Include API Key in the response
      };
    });

    console.log(data);

    res.json({ data });
  });
});

router.get("/v1/augmentations", (req, res) => {
  /* TO-DO: id, name, description
   */

  // read the augmentations from the augmentations folder
  const augmentations = fs.readdirSync("./openAI/augmentations").map((file) => {
    return {
      name: file.replace(".js", ""),
    };
  });

  res.json({ data: augmentations });
});

router.get("/v1/models", (req, res) => {
  console.log("GET /v1/models");
  const authorization = req.headers["llm-user"] || "";
  console.log("llm-user:", authorization);
  console.log("ADMIN_API_KEY:", process.env.ADMIN_API_KEY);

  const referrer = req.headers["referer"] || "";

  // Determine which SQL to use based on whether the user is the admin
  let sql;
  let params;
  let baseSql = `SELECT
                    m.id, m.type, m.max_tokens,
                    p.vectorDB, p.collection, p.embedding AS embedding,
                    p.promptTemplate, p.systemPrompt,
                    p.topK, p.augmentation, p.llm
                  FROM models m
                  JOIN presets p ON m.id = p.modelId`;

  if (
    authorization === process.env.ADMIN_API_KEY ||
    referrer.includes("5002") || // FIXME: This is a hack to allow the admin to access the models, should be replaced by an environment variable
    req.headers["host"] === "localhost:5002"
  ) {
    sql = baseSql;
    params = []; // No parameters needed for admin query
  } else {
    sql = `${baseSql} WHERE p.apikey = ?`;
    params = [authorization]; // Use authorization as parameter for non-admin users
  }

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }

    const data = rows.map((row) => ({
      id: row.id,
      type: row.type,
      max_tokens: row.max_tokens,
      vectorDB: row.vectorDB,
      collection: row.collection,
      embedding: row.embedding,
      promptTemplate: row.promptTemplate,
      systemPrompt: row.systemPrompt,
      topK: row.topK,
      augmentation: row.augmentation,
      llm: row.llm,
      apiKey: row.apiKey, // Include apiKey in the response
    }));

    res.json({ data });
  });
});

let ingestDocuments = async (collectionName, data, embeddingFunction) => {
  let collection;

  // "text-embedding-3-small",  "text-embedding-3-large";
  const openai_ef = new OpenAIEmbeddingFunction({
    openai_api_key: OPENAI_API_KEY,
    openai_model: embeddingFunction,
  });

  // add collection name and embedding function to the collections table
  const sql = `INSERT INTO collections (collection, embeddingFunction) VALUES (?, ?)`;
  db.run(sql, [collectionName, embeddingFunction], function (err) {
    if (err) {
      if (
        err.message.includes("UNIQUE constraint failed: collections.collection")
      ) {
        console.log("Collection already exists.");
      } else {
        console.error(err.message);
        throw new Error("Error adding to collections table");
      }
    }
  });

  console.log(`Ingesting ${data.length} documents into ${collectionName}...`);
  // console.log("Ingesting documents:", data);

  const documents = [];
  const metadatas = [];
  let ids = [];

  // console.log("Data:", data);

  data.forEach((item) => {
    if (item.text && item.url && item.url.length > 0 && item.text.length > 0) {
      documents.push(item.text);

      // for each item key, value pair, add the key and value to the metadatas array
      const metadata = {};
      for (let key in item) {
        metadata[key] = item[key];
      }

      metadatas.push(metadata);

      ids.push(item.url);
    }
  });

  try {
    collection = await client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: openai_ef,
    });
  } catch (error) {
    console.error("Error getting or creating collection:", error);
  }

  //  console.log("Collection:", collection);
  //  console.log("Documents:", documents);

  if (documents.length > 0) {
    try {
      // Before attempting to ingest documents, check if the IDs are unique.

      const uniqueIds = new Set(ids);
      if (uniqueIds.size !== ids.length || ids.length == 0) {
        // generate an array of ids with the same length as documents using uuid()
        ids = Array.from({ length: documents.length }, () => uuidv4());

        // throw new Error("The IDs are not unique.");
      }
      // console.log("After checking for unique IDs:", ids  );

      await collection.upsert({ documents, metadatas, ids });
      console.log(
        `Ingested ${documents.length} documents into ${collectionName}.`
      );

      return documents.length; // ingestedNum
    } catch (error) {
      console.error("Error ingesting documents:", error);
      throw new Error("The IDs are not unique.");
    }
  }
};

const handleQuery = async (collectionName, query) => {
  try {
    // Wrap the db.get call in a Promise
    const getEmbeddingFunction = new Promise((resolve, reject) => {
      const sql = `SELECT embeddingFunction FROM collections WHERE collection = ?`;
      db.get(sql, [collectionName], (err, row) => {
        if (err) {
          console.error(err.message);
          return reject(
            "Error getting embedding function from collections table"
          );
        }
        const embeddingFunction = row
          ? row.embeddingFunction
          : "text-embedding-3-small"; // default value
        resolve(embeddingFunction);
      });
    });

    // Await for the embedding function
    const embeddingFunction = await getEmbeddingFunction;

    console.log("Embedding function:", embeddingFunction);

    const model = embeddingFunction; // "text-embedding-3-small",  "text-embedding-3-large";

    const openai_ef = new OpenAIEmbeddingFunction({
      openai_api_key: OPENAI_API_KEY,
      openai_model: model,
    });

    // Assuming client.getCollection and collection.query return Promises
    const collection = await client.getCollection({
      name: collectionName,
      embeddingFunction: openai_ef,
    });

    if (!collection) {
      throw new Error(`Collection ${collectionName} not found.`);
    }

    const results = await collection.query({
      queryTexts: [query],
      nResults: 5, // Adjust as needed
    });

    return results;
  } catch (error) {
    // Handle or throw the error
    console.error(error);
    throw new Error("Error in handleQuery: " + error);
  }
};

let handleJSONFile = async (filePath, collectionName, embeddingFunction) => {
  console.log("Processing file:", filePath);
  let ingestedNum = 0;
  let data;

  try {
    data = await fs.promises.readFile(filePath, "utf8");
    const json = JSON.parse(data);
    ingestedNum = await ingestDocuments(
      collectionName,
      json,
      embeddingFunction
    );
  } catch (error) {
    console.error("An error occurred while reading the file:", error);
    console.log(data);
  }

  // Remove the JSON file after ingestion
  await fs.promises.unlink(filePath);

  return ingestedNum;
};

let handleZipFile = async (zipFilePath, collectionName, embeddingFunction) => {
  // Extract the ZIP file
  await fs
    .createReadStream(zipFilePath)
    .pipe(unzipper.Extract({ path: "temp" }))
    .promise();

  let ingestedNum = 0;
  const files = await fs.promises.readdir("temp");

  for (let file of files) {
    if (file.endsWith(".json")) {
      ingestedNum += await handleJSONFile(
        path.join("temp", file),
        collectionName,
        embeddingFunction
      );
    }
  }

  // Remove the uploaded ZIP file after processing
  await fs.promises.unlink(zipFilePath);

  return ingestedNum;
};

let handleIngest = async (file, res, collectionName, embeddingFunction) => {
  let ingestedNum;

  try {
    if (file.originalname.endsWith(".zip")) {
      ingestedNum = await handleZipFile(
        file.path,
        collectionName,
        embeddingFunction
      );
    } else if (file.originalname.endsWith(".json")) {
      ingestedNum = await handleJSONFile(
        file.path,
        collectionName,
        embeddingFunction
      );
    } else {
      console.log(file.originalname + " is not a valid file type.");
      throw new Error("Unsupported file type");
    }

    if (ingestedNum > 0) {
      res.send({
        success: true,
        message: `${ingestedNum}  documents ingested successfully.`,
      });
    } else {
      res.send({
        success: false,
        message: "Error ingesting documents.",
      });
    }
  } catch (err) {
    console.error("Error during file processing or ingestion", err);

    // Check if headers have already been sent
    if (!res.headersSent) {
      // Headers have not been sent yet, so we can send an error response
      return res.status(500).send({
        success: false,
        message: "Error processing files",
        error: err.message,
      });
    } else {
      // Headers were already sent, log the error or handle it as needed
      console.error("An attempt was made to send multiple responses.", err);
    }
  }
};

router.get("/chromadb/embeddingFunctions", async (req, res) => {
  // get collections and embedding functions from sqlite collections table
  const sql = `SELECT collection, embeddingFunction FROM collections`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Internal Server Error");
      return;
    }

    const data = rows.map((row) => {
      return {
        collection: row.collection,
        embeddingFunction: row.embeddingFunction,
      };
    });

    res.json({ data });
  });
});

router.post(
  "/chromadb/ingest",
  ensureAuthenticated,
  upload.single("document"),
  async (req, res) => {
    const embeddingFunction = req.body.embeddingFunction;
    const collectionName = req.body.collectionName;
    const file = req.file;

    console.log("Received request to ingest file:", file);
    console.log("Embedding function:", embeddingFunction);
    console.log("Collection name:", collectionName);

    try {
      const response = await handleIngest(
        file,
        res,
        collectionName,
        embeddingFunction
      );

      if (!res.headersSent) res.json({ message: response });
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        return res.status(500).send({
          success: false,
          message: "Error ingesting file",
          error: error.message,
        });
      } else {
        console.error("An attempt was made to send multiple responses.", error);
      }
    }
  }
);

router.post("/chromadb/query", ensureAuthenticated, async (req, res) => {
  const query = req.body.query;
  const collectionName = req.body.collectionName;

  console.log(
    "Received request to query collection:",
    collectionName,
    "with query:",
    query
  );

  try {
    const response = await handleQuery(collectionName, query);

    if (!res.headersSent) res.json({ message: response });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      return res.status(500).send({
        success: false,
        message: "Error processing query",
        error: error.message,
      });
    } else {
      console.error("An attempt was made to send multiple responses.", error);
    }
  }
});

module.exports = router;
