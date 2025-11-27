const express = require('express');
const router = express.Router();

// Helper: require login
function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    // You can also use res.redirect('/users/login') if lab wants redirect
    return res.status(401).send('You must be logged in to perform this action.');
  }
  next();
}

// Books home page
router.get('/', function (req, res, next) {
  res.render('books', { title: "Bertie's Books" });
});

// List all books (HTML)
router.get('/list', function (req, res, next) {
  let sqlquery = 'SELECT * FROM books';

  db.query(sqlquery, (err, result) => {
    if (err) return next(err);
    res.render('list.ejs', { availableBooks: result });
  });
});

// Bargain books (price < 15)
router.get('/bargains', function (req, res, next) {
  let sqlquery = 'SELECT * FROM books WHERE price < 15';

  db.query(sqlquery, (err, result) => {
    if (err) return next(err);
    res.render('bargains.ejs', { cheapBooks: result });
  });
});

// Show Add Book form (PROTECTED)
router.get('/addbook', requireLogin, function (req, res, next) {
  res.render('addbook.ejs');
});

// Handle Add Book submission (PROTECTED)
router.post('/bookadded', requireLogin, function (req, res, next) {
  let sqlquery = 'INSERT INTO books (name, price) VALUES (?, ?)';
  let newrecord = [req.body.name, req.body.price];

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

module.exports = router;