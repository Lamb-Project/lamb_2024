const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const { ensureAuthenticated } = require("./utils");

const model_db_path = process.env.MODEL_DB_PATH || "models.db";
const db = new sqlite3.Database(model_db_path);

const bcrypt = require("bcrypt");

router.get("/users", ensureAuthenticated, (req, res) => {
  res.render("users");
});

// Endpoint for creating a new user 
router.post("/v1/users", ensureAuthenticated, (req, res) => {
  const { name, password } = req.body;

  bcrypt.hash(password, 10, (err, hash) => {

    // Insert the user into the users table
    db.run(
      "INSERT INTO users (name, password) VALUES (?, ?)",
      [name, hash],
      function (err) {
        if (err) {
          console.error(err);
          res
            .status(500)
            .json({ error: "An error occurred while creating the user" });
          return;
        }
      }
    );
  });
});

// Endpoint for removing a user
router.delete("/v1/users/:id", ensureAuthenticated, (req, res) => {
  const userId = req.params.id;

  db.run("DELETE FROM users WHERE id = ?", [userId], function (err) {
    if (err) {
      console.error(err);
      res
        .status(500)
        .json({ error: "An error occurred while removing the user" });
      return;
    }

    res.json({ message: "User removed successfully" });
  });
});

// Endpoint to get users
router.get("/v1/users", ensureAuthenticated, (req, res) => {
  // get all users' info
  db.all(
    `SELECT users.id, users.name, users.apikey FROM users`,
    (err, rows) => {
      if (err) {
        console.error(err);
        res
          .status(500)
          .json({ error: "An error occurred while fetching users" });
        return;
      }

      res.json(rows);
    }
  );
});

module.exports = router;
