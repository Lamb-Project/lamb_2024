const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./models.db');

passport.use(new LocalStrategy(
  {
    usernameField: 'name', 
    passwordField: 'password'
  },
  (name, password, done) => {
    console.log("LocalStrategy triggered with username:", name); 
    
    db.get(`SELECT * FROM users WHERE name = ?`, name, (err, row) => {
      if (err) {
        console.error("Database error:", err);
        return done(err);
      }

      if (!row) {
        console.log("User not found in database");
        return done(null, false, { message: 'Invalid username.' });
      }

      console.log("User found in database:", row);
      const user = row;
      
      console.log("Received password:", password);
      console.log("user password:", user.password);

      bcrypt.compare(password, user.password, (err, isValid) => {
        if (err) {
          console.error("bcrypt comparison error:", err);
          return done(err);
        }

        if (!isValid) {
          console.log("Invalid password");
          return done(null, false, { message: 'Invalid password.' });
        }

        console.log("Authentication successful for user:", user);
        return done(null, user);
      });
    });
  }
));

passport.serializeUser((user, done) => {
  console.log("Serializing user:", user);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // console.log("Deserializing user with ID:", id); 
  db.get(`SELECT * FROM users WHERE id = ?`, id, (err, row) => {
    if (err) {
      console.error("Database error during deserialization:", err);
      return done(err);
    }
    done(null, row);
  });
});