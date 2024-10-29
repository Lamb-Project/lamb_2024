const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs").promises;
const pdfParse = require("pdf-parse");
const path = require("path");
const { ensureAuthenticated } = require("./utils");

// Environment variables for file directory and base URL, with defaults if not specified
const UPLOADS_DIR = process.env.UPLOADS_DIR || "/app/public/uploads";
const BASE_URL = process.env.BASE_URL || "http://localhost:5002/uploads";

function sanitizeFilename(filename) {
  // Replace spaces with hyphens, remove special chars, limit to alphanumeric and hyphens
  return filename
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^\w\-\.]+/g, "") // Remove all non-word chars except dots
    .normalize("NFD") // Normalize accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase() // Convert to lowercase to avoid case inconsistency
    .substring(0, 255); // Limit filename length for safety
}

let timestamp = Date.now();

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {

    console.log(req.body);

    const libraryName = req.body.libraryName || req.query.libraryName || "default";
    const uploadDir = path.join(UPLOADS_DIR, libraryName);
    console.log(`Pre-Ingestion: Creating directory at ${uploadDir}`);
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      console.error("Error creating directory:", err);
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    const newFileName = timestamp + "-" + sanitizeFilename(file.originalname);
    console.log(`Pre-Ingestion: Storing file as ${newFileName}`);
    cb(null, newFileName);
  },
});

// Create a Multer instance and use it to handle file uploads.
const upload = multer({ storage: storage });

router.post("/util/pre-ingest", upload.single("file"), handlePreIngestion);

async function handlePreIngestion(req, res) {
  console.log("Pre-Ingestion: started");
  if (!req.file) {
    console.log("No file uploaded.");
    return res.status(400).send("No file uploaded.");
  }

  const filePath = req.file.path;
  const title = req.body.title;
  const libraryName = req.body.libraryName || "default";
  const sanitizedOriginalName = sanitizeFilename(req.file.originalname);
  //timestamp = Date.now();
  const jsonFileName = `${timestamp}-${sanitizedOriginalName.replace(
    ".pdf",
    ".json"
  )}`;
  const jsonPath = path.join(path.dirname(filePath), jsonFileName);
  // Updated to include timestamp in the PDF filename
  const timestampedPDFName = `${timestamp}-${sanitizedOriginalName}`;
  const pdfUrl = `${BASE_URL}/${libraryName}/${timestampedPDFName}`;
  const jsonUrl = `${BASE_URL}/${libraryName}/${jsonFileName}`;

  try {
    await processFile(filePath, jsonPath, jsonFileName, title, pdfUrl);
    // Update manifest using the refactored function
    await updateManifest(libraryName, title, {
      pdf: {
        path: filePath,
        url: pdfUrl,
      },
      json: {
        path: jsonPath,
        url: jsonUrl,
      },
    });
    res.send({
      jsonPath: jsonUrl,
      pdfUrl: pdfUrl,
      message: "Files processed successfully.",
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    res.status(500).send("Error processing the PDF file.");
  } finally {
    cleanUpFile(filePath, req.body.keepFile);
  }
}

function cleanUpFile(filePath, keepFile) {
  /*/ if (keepFile !== 'true') {
        fs.unlink(filePath).catch(err => console.error('Failed to delete file:', err));
        console.log(`Pre-Ingestion: File ${filePath} deleted.`);
    }
    /*/
}

function splitTextIntoChunks(text) {
  // la maravillosa estrategia de chunking
  return text.split(/\n\n/);
}

async function processFile(filePath, jsonPath, jsonFileName, title, pdfUrl) {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);
  const textBlocks = splitTextIntoChunks(data.text);
  let outputData = [];
  let pageNumber = 1; // Starting page number
  let url = pdfUrl;
  for (let block of textBlocks) {
    url = `${pdfUrl}#page=${pageNumber}`;
    outputData.push({
      number: pageNumber,
      title: title,
      page: pageNumber,
      text: block,
      kind: "online_pdf",
      filename: jsonFileName,
      url: url,
    });
    pageNumber++;
  }

  await fs.writeFile(jsonPath, JSON.stringify(outputData, null, 4));
  console.log(`Pre-Ingestion: JSON output written to ${jsonPath}`);
}

// Generalized manifest update function
async function updateManifest(libraryName, title, fileData) {
  const libraryPath = path.join(UPLOADS_DIR, libraryName);
  const manifestPath = path.join(libraryPath, "manifest.json");
  let manifest;
  
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    manifest = {};
  }

  manifest[title] = fileData; 
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4));
  console.log(`Manifest updated at ${manifestPath}`);
}

async function _updateManifest(filePath, jsonPath, jsonUrl, pdfUrl, title) {
  const manifestPath = path.join(path.dirname(filePath), "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (error) {
    manifest = {};
  }
  manifest[title] = {
    pdf: {
      path: filePath,
      url: pdfUrl,
    },
    json: {
      path: jsonPath,
      url: jsonUrl,
    },
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 4));
  console.log(`Manifest updated at ${manifestPath}`);
}

router.get("/util/library-files/:libraryName", async (req, res) => {
  const libraryName = req.params.libraryName;
  const libraryPath = path.join(UPLOADS_DIR, libraryName, "manifest.json"); // Append 'manifest.json' to the path

  try {
    const manifestData = await fs.readFile(libraryPath, "utf8");
    const manifest = JSON.parse(manifestData);
    res.json(manifest);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.status(404).send("Manifest file not found.");
    } else {
      console.error("Error reading manifest:", error);
      res.status(500).send("Error retrieving the manifest file.");
    }
  }
});

// Veresion with promises
router.get("/util/libraries", async (req, res) => {
  try {
    const directories = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    const libraryNames = directories
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    console.log("Libraries listed successfully.");
    res.send({ libraries: libraryNames });
  } catch (error) {
    console.error("Failed to list libraries:", error);
    res.status(500).send("Unable to list libraries.");
  }
});

router.get("/add-model", ensureAuthenticated, async (req, res) => {
  res.render("add-model");
});

router.get("/library", ensureAuthenticated, (req, res) => {
  res.render("library");
});

router.get("/pre-ingestion", ensureAuthenticated, (req, res) => {
  res.render("pre-ingestion");
});

router.get("/inspect-libs", ensureAuthenticated, (req, res) => {
  res.render("inspect-libs");
});

router.get("/pre-ingestion", ensureAuthenticated, (req, res) => {
  res.render("pre-ingestion");
});

router.get("/new-library", ensureAuthenticated, (req, res) => {
  res.render("new-library");
});

router.get("/dbmanage", ensureAuthenticated, (req, res) => {
  res.render("dbmanage");
});

router.get("/add-query", ensureAuthenticated, (req, res) => {
  res.render("add-query");
});

router.get("/add-ingestion", ensureAuthenticated, (req, res) => {
  res.render("add-ingestion");
});

router.get("/add-subtitles", ensureAuthenticated, (req, res) => {
  res.render("process-subtitles");
});

router.post("/util/create-library", ensureAuthenticated, async (req, res) => {
  const rawLibraryName = req.body.libraryName;
  if (!rawLibraryName) {
    console.error("Create-Library: No library name provided.");
    return res.status(400).send({ error: "Library name is required." });
  }

  const libraryName = sanitizeFilename(rawLibraryName);
  if (!libraryName) {
    console.error("Create-Library: Invalid library name provided.");
    return res.status(400).send({ error: "Invalid library name." });
  }

  const libraryPath = path.join(UPLOADS_DIR, libraryName);

  try {
    await fs.mkdir(libraryPath, { recursive: true });
    console.log(`Create-Library: Directory created at ${libraryPath}`);
    res.send({ message: "Library created successfully.", path: libraryPath });
  } catch (error) {
    console.error("Create-Library: Error creating directory", error);
    switch (error.code) {
      case "EEXIST":
        res.status(400).send({ error: "Library already exists." });
        break;
      case "EPERM":
        res.status(403).send({ error: "Permission denied." });
        break;
      default:
        res.status(500).send({ error: "Failed to create library directory." });
    }
  }
});

function sbvToSrt(sbvContent) {
    let srtContent = [];
    const entries = sbvContent.trim().split(/\r\n\r\n/);
  
    for (let index = 0; index < entries.length; index++) {
      const lines = entries[index].split('\n');
      if (lines.length < 2) {
        continue;
      }
  
      const times = lines[0].replace(',', ' --> ').replace('.', ',');
      srtContent.push(`${index + 1}`);
      srtContent.push(times);
      srtContent = srtContent.concat(lines.slice(1));
      srtContent.push("");
    }
  
    return srtContent.join("\n");
  }
  
  function splitIntoChunks(subtitles, maxWords = 100) {
    const chunks = [];
    let currentChunk = "";
    let currentWordCount = 0;
    let currentStartTime = "";
    let currentEndTime = "";
  
    for (const subtitle of subtitles) {
      // Start a new chunk if it's the first subtitle or we reached max words
      if (currentWordCount === 0) {
        currentStartTime = subtitle.start;
        currentChunk = subtitle.text + " ";
        currentWordCount = subtitle.text.split(/\s+/).length;
      } else {
        currentChunk += subtitle.text + " ";
        currentWordCount += subtitle.text.split(/\s+/).length;
      }
  
      // End the current chunk if we reach the max word limit
      if (currentWordCount >= maxWords) {
        currentEndTime = subtitle.end;
        chunks.push({
          start: currentStartTime,
          end: currentEndTime,
          text: currentChunk.trim(),
        });
        currentChunk = "";
        currentWordCount = 0;
      }
    }
  
    // Add the last chunk if there's any remaining text
    if (currentChunk) {
      chunks.push({
        start: currentStartTime,
        end: subtitles[subtitles.length - 1].end,
        text: currentChunk.trim(),
      });
    }
  
    return chunks;
  }
  
  function parseSrt(srtData) {
    const subtitles = [];
    const blocks = srtData.split('\n\n');
    for (const block of blocks) {
      if (block.trim()) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
          const startEnd = lines[1].split(' --> ');
          subtitles.push({
            start: startEnd[0],
            end: startEnd[1],
            text: lines.slice(2).join(' '),
          });
        }
      }
    }
    return subtitles;
  }
  
  
  function convertSubtitlesToJson(subs, url, filename) {
    const subsJson = [];
    for (const sub of subs) {
      const splitSub = sub.split("\n");
      const timeRange = splitSub[1].split("-->");
      const timestampStart = timeRange[0].trim();
      const [hours, minutes, seconds] = timestampStart.split(":");
      const secondsWithMilliseconds = `${seconds.split(".")[0]}${seconds.split(".")[1] ? `.${seconds.split(".")[1]}` : ``}`;
      const urlWithTimestamp = `${url}?t=${Math.floor(parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(secondsWithMilliseconds))}s`;
      subsJson.push({
        number: parseInt(splitSub[0]),
        timestampStart,
        timestampEnd: timeRange[1].trim(),
        text: splitSub.slice(2).join("\n"),
        kind: "online_video",
        language: "es",
        filename,
        url: urlWithTimestamp
      });
    }
    return subsJson;
  }


router.post("/util/process-subtitles",  upload.single('sbvFile'), async (req, res) => {
    const { url, title = 'default', libraryName = 'default' } = req.body;
    console.log(`Processing subtitles for ${title} in ${libraryName}`);
    
    const sbvFile = req.file;

    if (!sbvFile) {
        return res.status(400).send('No SBV file uploaded.');
    }

    try {
      const sbvContent = await fs.readFile(sbvFile.path, "utf-8");
      const srtContent = sbvToSrt(sbvContent);
      const subtitles = parseSrt(srtContent);
      const chunks = splitIntoChunks(subtitles);
  
      const formattedChunks = chunks.map(
        (chunk, i) => `${i + 1}\n${chunk.start} --> ${chunk.end}\n${chunk.text}`
      );
  
      const jsonFileName = `${Date.now()}-${sanitizeFilename(sbvFile.originalname.replace(".sbv", ".json"))}`; 
      const jsonPath = path.join(path.dirname(sbvFile.path), jsonFileName);
      const jsonUrl = `${BASE_URL}/${libraryName}/${jsonFileName}`;
      const jsonOutput = convertSubtitlesToJson(formattedChunks, url, jsonFileName);
      
      await fs.writeFile(jsonPath, JSON.stringify(jsonOutput, null, 4));
  
      // Update manifest
      await updateManifest(libraryName, title, {
        sbv: {
          path: sbvFile.path,
          url: `${BASE_URL}/${libraryName}/${sbvFile.filename}`
        },
        json: {
          path: jsonPath,
          url: jsonUrl 
        }
      });
  
      res.json(jsonOutput);
    } catch (error) {
      console.error("Error processing subtitles:", error);
      res.status(500).send("Error processing subtitles.");
    }
});

module.exports = router;
