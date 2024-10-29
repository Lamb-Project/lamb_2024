const { ChromaClient, OpenAIEmbeddingFunction } = require("chromadb");
const CHROMADB_HOST = process.env.CHROMADB_HOST || "localhost";
const chroma_url = `http://${CHROMADB_HOST}:8000`;
const client = new ChromaClient({ path: chroma_url });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable not set");
}

async function queryCollection(collectionName, query, numResults, embeddingFunction) {

  // Initialize the embedding function
  const openai_ef = new OpenAIEmbeddingFunction({
    openai_api_key: OPENAI_API_KEY,
    openai_model: embeddingFunction,
  });

  const collection = await client.getCollection({
    name: collectionName,
    embeddingFunction: openai_ef,
  });

  const result = await collection.query({
    queryTexts: [query],
    nResults: numResults,
  });
  return result;
}

module.exports = {
  queryCollection,
};
