const express = require("express");
const router = express.Router();
const { tokenize } = require("../utils/tokenize");
const fs = require("fs");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const { queryCollection } = require("./chromadb");

const MAX_TURNS = process.env.MAX_TURNS || 5;

router.post("/v1/chat/completions", async (req, res) => {
  let { messages, stream, model } = req.body;

  // Check if 'messages' is provided and is an array
  if (!messages || !Array.isArray(messages)) {
    return res
      .status(400)
      .json({ error: 'Missing or invalid "messages" in request body' });
  }

  console.log("21: Messages:" + JSON.stringify(messages));

  // check that last message is from the user and its content is not an array
  if (
    messages[messages.length - 1].role == "user" &&
    Array.isArray(messages[messages.length - 1].content)
  ) {
    return res.status(400).json({
      error: 'Last message should be from the user and not an array',
    });
  }


  // Check if 'stream' is a boolean
  if (stream !== undefined && typeof stream !== "boolean") {
    return res.status(400).json({ error: 'Invalid "stream" in request body' });
  }


  // get presets of the model
  console.log("28: Modelo:" + model);
  let topK,
    collection,
    systemPrompt,
    augmentation,
    modelFound = true;

  // await fetch json from /v1/models
  await fetch("http://mockai:5002/v1/models/" + model, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((response) => {
      console.log(response.data);
      if (response.data.length > 0) {
        topK = response.data[0].topK;
        collection = response.data[0].collection;
        promptTemplate = response.data[0].promptTemplate;
        systemPrompt = response.data[0].systemPrompt;
        augmentation = response.data[0].augmentation;
        llm = response.data[0].llm;
        embeddingFunction = response.data[0].embedding;
      } else {
        modelFound = false;
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });

  console.log("61: LLM:" + llm);

  let context, augmentedPrompt;
  const query = messages.pop().content;

  if (modelFound) {
    const { augment } = require(`./augmentations/${augmentation}`);

    // const query = messages[messages.length - 1].content;

    console.log("71: " + query);
    console.log("72: Stream:" + stream);
    console.log("73: Query:" + query);
    console.log("74: TOPK:" + topK);

    try {
      context = await queryCollection(
        collection,
        query,
        topK,
        embeddingFunction
      );
    } catch (error) {
      console.error("Failed to fetch collections:", error);
      // content = `La colección ${collection} no existe`;
    }

    if (stream) { // !stream = Create a concise, 3-5 word phrase as a header for the following query...
      try {
        augmentedPrompt = await augment(context, query, promptTemplate);
        console.log("92:" + JSON.stringify(augmentedPrompt));
      } catch (error) {
        console.error("Error in augmentation:", error);
        augmentedPrompt.success = false;
      }
    }
  } else {
    console.log("98: No presets found for model " + model);
    augmentedPrompt.success = false;
    // content = "No se encontraron presets para el modelo " + model;
  }

  // Trim messages to the maximum window size 
  if (messages.length > MAX_TURNS) {
    messages = messages.slice(messages.length - MAX_TURNS);
  }
  
  // Generate a mock response
  // If 'stream' is true, set up a Server-Sent Events stream
  if (stream && augmentedPrompt.success && augmentedPrompt.needsAugmentation) {
    // Set the headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // prepend system prompt to the messages
    messages.unshift({
      role: "system",
      content: systemPrompt,
    });

    // Append the augmented prompt to the messages
    messages.push({
      role: "user",
      content: augmentedPrompt.augmentedPrompt,
    });

    // console log line number
    console.log("124: Messages:" + JSON.stringify(messages));

    const data = {
      id: "chatcmpl-7UR4UcvmeD79Xva3UxkKkL2es6b5W",
      object: "chat.completion.chunk",
      created: Date.now(),
      model: llm,
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            content: "",
          },
          finish_reason: null,
        },
      ],
    };

    try {
      console.log("144: Received request:", req.body);

      const stream = openai.beta.chat.completions.stream({
        model: llm,
        stream: true,
        messages: messages,
      });

      // Sends each content stream chunk-by-chunk, such that the client
      // ultimately receives a single string.
      for await (const chunk of stream) {
        data.choices[0].delta.content = chunk.choices[0]?.delta.content;

        // console.log(JSON.stringify(data));
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }

      data.choices[0] = {
        delta: {},
        finish_reason: "stop",
      };
      // console.log(JSON.stringify(data));
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      res.write(`data: [DONE]\n\n`);

      res.end();
    } catch (e) {
      console.error(e);
    }
  } else if (!stream) {
    // If 'stream' is false, send a direct response
    try {

      let response = await openai.chat.completions.create({
        model:llm,
        messages:[
          {"role": "system", "content": "You are a helpful assistant."},
          {"role": "user", "content": query}
        ]
      });
      
      // Send the response
      res.json(response);
    } catch (error) {
      console.error("Error in OpenAI request:", error);
      res.status(500).json({ error: "Internal server error" });
    }

  } else { // FIXME: this should be a direct answer but I don't know how to set the stream to false in openwebui
    // Set the headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const data = {
      id: "cmpl-7UR4UcvmeD79Xva3UxkKkL2es6b5W",
      object: "chat.completion.chunk",
      created: Date.now(),
      model: model,
      choices: [
        {
          index: 0,
          delta: {
            role: "assistant",
            content: "",
          },
          finish_reason: null,
        },
      ],
    };

    const intervalTime = 0;
    let chunkIndex = 0;
    let tokens = tokenize(augmentedPrompt.augmentedPrompt + "\n"); // Tokenize the content

    let intervalId = setInterval(() => {
      if (chunkIndex < tokens.length) {
        data.choices[0].delta.content = tokens[chunkIndex];
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        chunkIndex++;
      } else {
        clearInterval(intervalId);
        data.choices[0] = {
          delta: {},
          finish_reason: "stop",
        };
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    }, intervalTime);
  }
});

module.exports = router;
