const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { body, validationResult } = require('express-validator');

// ------------------------
// GET registration form
// ------------------------
router.get('/register', function (req, res, next) {
  res.render('register.ejs', {
    errors: [],
    data: {}
  });
});

// ------------------------
// POST registration
// ------------------------
router.post(
  '/registered',
  [
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters long')
      .escape(),
    body('first')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .escape(),
    body('last')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .escape(),
    body('email')
      .trim()
      .isEmail()
      .withMessage('A valid email address is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  function (req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Re-display form with validation errors and the user’s input
      return res.status(400).render('register.ejs', {
        errors: errors.array(),
        data: req.body
      });
    }

    const { username, first, last, email, password } = req.body;

    // Hash password
    bcrypt.hash(password, saltRounds, function (err, hashedPassword) {
      if (err) {
        return next(err);
      }

      const sqlquery =
        'INSERT INTO users (username, first, last, email, hashedPassword) VALUES (?,?,?,?,?)';
      const newrecord = [username, first, last, email, hashedPassword];

      db.query(sqlquery, newrecord, (err, result) => {
        if (err) {
          return next(err);
        }

        const output =
          'Hello ' +
          first +
          ' ' +
          last +
          ' you are now registered! We will send an email to you at ' +
          email;

        res.send(output);
      });
    });
  }
);

// ------------------------
// LIST USERS (no passwords)
// ------------------------
router.get('/list', function (req, res, next) {
  const sqlquery = 'SELECT username, first, last, email FROM users';

  db.query(sqlquery, (err, result) => {
    if (err) {
      return next(err);
    }
    res.render('userlist.ejs', { users: result });
  });
});

// ------------------------
// LOGIN FORM
// ------------------------
router.get('/login', function (req, res, next) {
  res.render('login.ejs', { errors: [], data: {} });
});

// ------------------------
// HANDLE LOGIN + AUDIT
// ------------------------
router.post('/loggedin', function (req, res, next) {
  const { username, password } = req.body;

  const sqlquery =
    'SELECT username, hashedPassword FROM users WHERE username = ?';
  db.query(sqlquery, [username], (err, result) => {
    if (err) {
      return next(err);
    }

    if (result.length === 0) {
      // user not found → log failed attempt
      const auditSql =
        'INSERT INTO audit (username, success, details) VALUES (?, ?, ?)';
      db.query(
        auditSql,
        [username, false, 'Login failed: user not found'],
        (auditErr) => {
          if (auditErr) return next(auditErr);
          res.render('login.ejs', {
            errors: [{ msg: 'Login failed: user not found' }],
            data: { username }
          });
        }
      );
    } else {
      const hashedPassword = result[0].hashedPassword;

      bcrypt.compare(password, hashedPassword, function (err, match) {
        if (err) {
          return next(err);
        }

        if (match) {
          // Save user in session so index.ejs sees currentUser
          req.session.currentUser = { username };

          const auditSql =
            'INSERT INTO audit (username, success, details) VALUES (?, ?, ?)';
          db.query(
            auditSql,
            [username, true, 'Login successful'],
            (auditErr) => {
              if (auditErr) return next(auditErr);
              res.redirect('/');
            }
          );
        } else {
          const auditSql =
            'INSERT INTO audit (username, success, details) VALUES (?, ?, ?)';
          db.query(
            auditSql,
            [username, false, 'Login failed: wrong password'],
            (auditErr) => {
              if (auditErr) return next(auditErr);
              res.render('login.ejs', {
                errors: [{ msg: 'Login failed: incorrect password' }],
                data: { username }
              });
            }
          );
        }
      });
    }
  });
});

// ------------------------
// LOGOUT
// ------------------------
router.get('/logout', function (req, res, next) {
  req.session.currentUser = null;
  res.redirect('/');
});

// ------------------------
// AUDIT HISTORY PAGE
// ------------------------
router.get('/audit', function (req, res, next) {
  const sqlquery =
    'SELECT username, success, time, details FROM audit ORDER BY time DESC';

  db.query(sqlquery, (err, result) => {
    if (err) {
      return next(err);
    }
    res.render('audit.ejs', { auditRows: result });
  });
});

module.exports = router;