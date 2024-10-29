const express = require("express");
const router = express.Router();
const { ChromaClient } = require("chromadb");
const CHROMADB_HOST = process.env.CHROMADB_HOST || "localhost";
const chroma_url = `http://${CHROMADB_HOST}:8000`;
const { ensureAuthenticated } = require('./utils');

const client = new ChromaClient({
  path: chroma_url 
});

router.get('/db', ensureAuthenticated, async (req, res) => {
  const collections = await client.listCollections();
  const selectedCollection = req.query.collection; 
  
  res.render('db', { collections: collections, selectedCollection: null });
}); 

router.post('/db', ensureAuthenticated, async (req, res) => {
  const collectionName = req.body.collection;
  const collection = await client.getCollection({ name: collectionName });
  const results = await collection.get();
  const collections = await client.listCollections();

  res.render('db', {
    collections: collections,
    selectedCollection: collectionName,
    documents: results.documents,
    metadatas: results.metadatas,
    ids: results.ids
  });
});

router.post('/db/delete', ensureAuthenticated, async (req, res) => {
  const collectionName = req.body.collection;
  const documentId = req.body.id;

  const collection = await client.getCollection({ name: collectionName });
  await collection.delete({ ids: [documentId] });

  res.json({ success: true });
  
  // res.redirect('/db?collection=' + collectionName);
});


module.exports = router;
