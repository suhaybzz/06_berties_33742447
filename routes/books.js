const express = require('express');
const router = express.Router();

// simple auth middleware reused here
function ensureLoggedIn(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/users/login');
  }
  next();
}

// Books home page
router.get('/', function (req, res, next) {
  res.render('books', { title: "Bertie's Books" });
});

// List all books (HTML)
router.get('/list', function (req, res, next) {
  const sqlquery = 'SELECT * FROM books';

  db.query(sqlquery, (err, result) => {
    if (err) return next(err);
    res.render('list.ejs', { availableBooks: result });
  });
});

// Show Add Book form  (PROTECTED)
router.get('/addbook', ensureLoggedIn, function (req, res, next) {
  res.render('addbook.ejs');
});

// Handle Add Book submission (PROTECTED)
router.post('/bookadded', ensureLoggedIn, function (req, res, next) {
  const sqlquery = 'INSERT INTO books (name, price) VALUES (?, ?)';
  const newrecord = [req.body.name, req.body.price];

  db.query(sqlquery, newrecord, (err, result) => {
    if (err) return next(err);
    res.send(
      `This book is added to database, name: ${req.body.name}, price ${req.body.price}`
    );
  });
});

// Bargains page (optionally protected – you can remove ensureLoggedIn if lab says it's public)
router.get('/bargains', ensureLoggedIn, function (req, res, next) {
  const sqlquery = 'SELECT * FROM books WHERE price < 15';

  db.query(sqlquery, (err, result) => {
    if (err) return next(err);
    res.render('bargains.ejs', { cheapBooks: result });
  });
});

module.exports = router;
