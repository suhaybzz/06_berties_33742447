require('dotenv').config();

const express = require('express');
const ejs = require('ejs');
const path = require('path');
const mysql = require('mysql2');

// Create the Express app
const app = express();
const port = 8000;

// ----------------------
// MySQL Connection Pool
// ----------------------
const db = mysql.createPool({
  host: 'localhost',
  user: 'berties_books_app',
  password: 'qwertyuiop',
  database: 'berties_books',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Make DB available everywhere
global.db = db;

// ----------------------
// Express configuration
// ----------------------
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Shop name used by templates
app.locals.shopData = { shopName: "Bertie's Books" };

// ----------------------
// Route Handlers
// ----------------------
const mainRoutes = require('./routes/main');
app.use('/', mainRoutes);

const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes);

const booksRoutes = require('./routes/books');
app.use('/books', booksRoutes);

// ----------------------
// Start Server
// ----------------------
app.listen(port, () => {
  console.log(`Bertie's Books app running on port ${port}!`);
});
