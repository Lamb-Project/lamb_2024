const { ChromaClient } = require("chromadb");
const CHROMADB_HOST = process.env.CHROMADB_HOST || "localhost";
const chroma_url = `http://${CHROMADB_HOST}:8000`; // Or use process.env.CHROMA_SERVER_URL if set
const client = new ChromaClient({ path: chroma_url });

const fs = require('fs');
const path = require('path');

const bcrypt = require('bcrypt');

createAdminIfNotExists = (db) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  const user = {
    name: 'admin',
    password: adminPassword
  };

  // search for the user in the database
  db.get(`SELECT * FROM users WHERE name = ?`, user.name, (err, row) => {
    if (err) {
      console.error('Database error:', err);
    } else if (!row) {
      // if the user does not exist, create it
      bcrypt.hash(user.password, 10, (err, hash) => {
        user.password = hash;
        db.run(`INSERT INTO users (name, password) VALUES (?, ?)`, user.name, user.password, (err) => {
          if (err) {
            console.error(err);
          } else {
            console.log('User created!');
          }
        });
      });    
    } else {
      console.log('Admin user already exists');
    }
  });


}

createMissingTables = (db) => {
  // Path to the SQL file
  const sqlFilePath = path.join(__dirname, '../db.sql');

  // Read SQL from the file
  fs.readFile(sqlFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read SQL file:', err);
      return;
    }

    // Split the file content into individual SQL commands
    const sqlCommands = data.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length);

    // Serialize database operations
    db.serialize(() => {
      // Execute each SQL command
      sqlCommands.forEach(sql => {
        if (sql) {
          db.run(sql, (err) => {
            if (err) {
              console.error('Error executing SQL:', err);
            } else {
              console.log('SQL executed successfully:', sql.substring(0, 50) + '...');
            }
          });
        }
      });
    });
  });
};


// Middleware to protect routes - redirect to '/' if not logged in
function ensureAuthenticated(req, res, next) {
  const debugging = process.env.DEBUG;
 
  if (debugging || req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}


module.exports = {
  client,
  createMissingTables,
  ensureAuthenticated,
  createAdminIfNotExists
};
