const express = require("express");
const router = express.Router();

const { client } = require("./utils");


router.get("/api/collections", async (req, res) => {  // FIXME: this route and the next one are doing almost the same thing
    try {
      // List all collections
      const collections = await client.listCollections();
      res.json(collections);
    } catch (error) {
      console.error("No se encontró la colección:", error);
      res.status(500).send("Internal Server Error");
    }
  });    
    
// Sample route for getting collection names
router.get('/chromadb/collections', async (req, res) => {
    try {
        const collections = await client.listCollections(); 
        console.log('Collections:', JSON.stringify(collections));

        // get number of items in each collection using await collection.count()
        for (let i = 0; i < collections.length; i++) {
            const collection = await client.getCollection({ name: collections[i].name /*, embeddingFunction: openai_ef */ });
            const count = await collection.count();
            collections[i].count = count;
        }

        res.json(collections);
    } catch (error) {
        console.error('Failed to get collections:', error);
        res.status(500).send('Failed to get collections');
    }
});

// await collection.peek(); // returns a list of the first 10 items in the collection
router.get('/chromadb/collections/:name/:howmany', async (req, res) => {
    try {
        const collectionName = req.params.name;
        const howmany = req.params.howmany;
        // console.log('Getting collection:', collectionName);
        const collection = await client.getCollection({ name: collectionName /*, embeddingFunction: openai_ef */ });
        if (!collection) {
            res.status(404).send(`Collection ${collectionName} not found`);
        } else {
            const peek = await collection.peek( {limit: howmany});
            res.json(peek);
        }
    } catch (error) {
        console.error('Failed to get collection:', error);
        res.status(500).send('Failed to get collection');
    }
});


router.delete('/chromadb/collections/:name', async (req, res) => {
    try {
        const collectionName = req.params.name;
        const collection = await client.getCollection({ name: collectionName /*, embeddingFunction: openai_ef */ });
        if (!collection) {
            res.status(404).send(`Collection ${collectionName} not found`);
        } else {
            await client.deleteCollection({ name: collectionName });
            res.status(204).send();
        }
    } catch (error) {
        console.error('Failed to delete collection:', error);
        res.status(500).send('Failed to delete collection');
    }
});


module.exports = router;