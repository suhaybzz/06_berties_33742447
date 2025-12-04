// routes/books.js
var express = require('express');
var router = express.Router();

// ----------------------
// BOOKS HOME
// ----------------------
router.get('/', function (req, res, next) {
  res.render('books', { title: "Bertie's Books" });
});

// ----------------------
// LIST ALL BOOKS (HTML)
// ----------------------
router.get('/list', function (req, res, next) {
  const sqlquery = 'SELECT * FROM books';

  db.query(sqlquery, (err, result) => {
    if (err) return next(err);
    res.render('list.ejs', { availableBooks: result });
  });
});

// ----------------------
// ADD BOOK (FORM + POST)
// ----------------------
router.get('/addbook', function (req, res, next) {
  res.render('addbook.ejs');
});

router.post('/bookadded', function (req, res, next) {
  const sqlquery = 'INSERT INTO books (name, price) VALUES (?, ?)';
  const newrecord = [req.body.name, req.body.price];

  db.query(sqlquery, newrecord, (err, result) => {
    if (err) return next(err);

    res.send(
      'This book is added to database, name: ' +
        req.body.name +
        ', price ' +
        req.body.price
    );
  });
});

// ----------------------
// BARGAIN BOOKS (HTML)
// ----------------------
router.get('/bargains', function (req, res, next) {
  const sqlquery = 'SELECT * FROM books WHERE price < 15';

  db.query(sqlquery, (err, result) => {
    if (err) return next(err);
    res.render('bargains.ejs', { cheapBooks: result });
  });
});

// ----------------------
// INTERNAL SEARCH (HTML)
// ----------------------

// show the “search by title” form
router.get('/search', function (req, res, next) {
  res.render('search.ejs');
});

// handle the search form, show HTML list of matches
router.get('/searchresult', function (req, res, next) {
  const searchTerm = '%' + req.query.keyword + '%';
  const sqlquery = 'SELECT * FROM books WHERE name LIKE ?';

  db.query(sqlquery, [searchTerm], (err, result) => {
    if (err) return next(err);
    res.render('searchresults.ejs', { books: result, keyword: req.query.keyword });
  });
});

// ---------------------------------------------------------
// 9b: JSON API – RETURN ALL BOOKS
//    GET /books/api/list   -> JSON [{id,name,price}, ...]
// ---------------------------------------------------------
router.get('/api/list', function (req, res, next) {
  const sqlquery = 'SELECT * FROM books';

  db.query(sqlquery, (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});

// ---------------------------------------------------------
// 9b: JSON API – SEARCH BOOKS BY KEYWORD (title)
//    GET /books/api/search?keyword=hobbit
//    -> JSON results
// ---------------------------------------------------------
router.get('/api/search', function (req, res, next) {
  const keyword = req.query.keyword || '';
  const sqlquery = 'SELECT * FROM books WHERE name LIKE ?';
  const searchTerm = '%' + keyword + '%';

  db.query(sqlquery, [searchTerm], (err, rows) => {
    if (err) return next(err);
    res.json(rows);
  });
});
// -----------------------------
// Lab 9b: JSON API endpoints
// -----------------------------

// Return ALL books as JSON
router.get('/listapi', function (req, res, next) {
  const sqlquery = 'SELECT id, name, price FROM books';

  db.query(sqlquery, (err, result) => {
    if (err) {
      return next(err);
    }
    // send JSON data
    res.json(result);
  });
});

// Search books by title as JSON
// Example: /books/searchapi?keyword=dune
router.get('/searchapi', function (req, res, next) {
  const keyword = req.query.keyword || '';          // read ?keyword= from URL
  const searchTerm = '%' + keyword + '%';

  const sqlquery = 'SELECT id, name, price FROM books WHERE name LIKE ?';

  db.query(sqlquery, [searchTerm], (err, result) => {
    if (err) {
      return next(err);
    }
    // send JSON data
    res.json(result);
  });
});


module.exports = router;
