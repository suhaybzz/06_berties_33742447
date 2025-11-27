require('dotenv').config();

// Core imports
const express = require('express');
const ejs = require('ejs');
const path = require('path');
const mysql = require('mysql2');
const session = require('express-session');

const app = express();
const port = 8000;

// ----------------------
// MySQL connection pool
// ----------------------
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'berties_books_app',
  password: process.env.DB_PASSWORD || 'qwertyuiop',
  database: process.env.DB_NAME || 'berties_books',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Make pool globally available
global.db = db;

// ----------------------
// View engine & middleware
// ----------------------
app.set('view engine', 'ejs');

// Parse form bodies
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Application data (same as before)
app.locals.shopData = { shopName: "Bertie's Books" };

// ----------------------
// Session middleware
// ----------------------
app.use(
  session({
    secret: 'berties-books-secret', // anything random, not used outside this app
    resave: false,
    saveUninitialized: false
  })
);

// ----------------------
// Make currentUser available in ALL views
// ----------------------
app.use((req, res, next) => {
  // If user is logged in, we expect req.session.user to exist (set in users.js)
  res.locals.currentUser = req.session.user || null;
  next();
});

// ----------------------
// Routes
// ----------------------
const mainRoutes = require('./routes/main');
app.use('/', mainRoutes);

const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes);

const booksRoutes = require('./routes/books');
app.use('/books', booksRoutes);

// ----------------------
// Start server
// ----------------------
app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
