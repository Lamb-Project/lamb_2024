CREATE TABLE IF NOT EXISTS collections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collection TEXT NOT NULL,
        embeddingFunction TEXT NOT NULL
      );

CREATE TABLE IF NOT EXISTS presets (
        modelId TEXT PRIMARY KEY, 
        vectorDB TEXT, 
        collection TEXT, 
        embedding TEXT, 
        promptTemplate TEXT, 
        systemPrompt TEXT, 
        topK INTEGER, 
        augmentation TEXT,
        llm TEXT
      );

CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY, 
        object TEXT, 
        created INTEGER, 
        type TEXT, 
        max_tokens INTEGER, 
        owner TEXT, 
        permissions TEXT
      );

CREATE TABLE IF NOT EXISTS "users" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  apikey TEXT,
  password TEXT
);
