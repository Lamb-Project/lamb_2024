require("dotenv").config();

const express = require("express");
const app = express();
const path = require('path'); 
const passport = require('passport');
const crypto = require('crypto');
const session = require('express-session');
const flash = require('connect-flash');



// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

const chatRoutes = require("./openAI/chat");
const imgRoutes = require("./openAI/image");
const embeddingRoutes = require("./openAI/embeddings");
const modelRoutes = require("./openAI/models");
const collectionRoutes = require("./openAI/collections");
const pre_ingestRoutes = require("./openAI/pre-ingest");
const dbRoute = require("./openAI/db");
const userRoutes = require("./openAI/user");

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public')); // Serve static files like HTML, CSS from the 'public' folder

app.use(session({
  secret: "youshouldchangethis",   // crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use(flash());

require('./passport.js');
app.use(passport.initialize());
app.use(passport.session());


function printRoutes(app) {
  const routes = [];
  app._router.stack.forEach(middleware => {
      if (middleware.route) { // routes registered directly on the app
          routes.push(middleware.route);
      } else if (middleware.name === 'router') { // router middleware
          middleware.handle.stack.forEach(handler => {
              let route;
              route = handler.route;
              route && routes.push(route);
          });
      }
  });
  console.log("MOCKAI: Available Endpoints:");
  routes.forEach(route => {
      console.log(`${Object.keys(route.methods).join(', ').toUpperCase()} - ${route.path}`);
  });
}
const start = async () => {

  const port = process.env.SERVER_PORT || 5001;
  app.use(express.json());
  app.use(chatRoutes);
  app.use(imgRoutes);
  app.use(embeddingRoutes);
  app.use(modelRoutes);
  app.use(collectionRoutes);
  app.use(pre_ingestRoutes);
  app.use(userRoutes);
  app.use(dbRoute);

  app.get("/", (req, res) => {
    res.render('login', {
      message: req.flash('error')
  });
  });

  app.post('/login', passport.authenticate('local', {
    failureRedirect: '/',
    failureFlash: true
  }), (req, res) => {
    console.log('Authentication successful.');
    res.redirect('/db');
  });
  
  app.get('/logout', (req, res) => {
    req.logout(function(err) {
      if (err) { 
        // Handle any logout errors (e.g., log the error)
        console.error("Error during logout:", err);
        return res.redirect('/'); // Or handle the error differently
      }
  
      // Successful logout
      res.redirect('/'); 
    });
  });

  app.use(function (req, res) {
    res.status(404).send("Page not found");
  });

  app.listen(port, () => {
    console.log(`Server is running at http://mockai:${port}`);
  });
  printRoutes(app);
};

start();
