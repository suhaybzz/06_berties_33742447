// routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const { body, validationResult } = require('express-validator');

// ========== REGISTER ==========

// GET registration form
router.get('/register', function (req, res, next) {
  res.render('register.ejs', {
    errors: [],
    formData: {}
  });
});

// POST registration with sanitisation + validation
router.post(
  '/registered',
  [
    // sanitise + validate
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ max: 50 }).withMessage('Username must be at most 50 characters')
      .escape(),
    body('first')
      .trim()
      .isLength({ max: 50 }).withMessage('First name must be at most 50 characters')
      .escape(),
    body('last')
      .trim()
      .isLength({ max: 50 }).withMessage('Last name must be at most 50 characters')
      .escape(),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Email must be a valid email address')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  ],
  function (req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      // Re-render form with errors + previous data
      return res.status(400).render('register.ejs', {
        errors: errors.array(),
        formData: {
          username: req.body.username,
          first: req.body.first,
          last: req.body.last,
          email: req.body.email
        }
      });
    }

    const { username, first, last, email, password } = req.body;

    // hash password
    bcrypt.hash(password, saltRounds, function (err, hashedPassword) {
      if (err) {
        return next(err);
      }

      // save user to database
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

// ========== LIST USERS (no passwords) ==========

router.get('/list', function (req, res, next) {
  const sqlquery = 'SELECT username, first, last, email FROM users';

  db.query(sqlquery, (err, result) => {
    if (err) {
      return next(err);
    }
    res.render('userlist.ejs', { users: result });
  });
});

// ========== LOGIN ==========

// LOGIN FORM
router.get('/login', function (req, res, next) {
  res.render('login.ejs', {
    errors: [],
    formData: {}
  });
});

// HANDLE LOGIN + AUDIT LOGGING with sanitisation + validation
router.post(
  '/loggedin',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .escape(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  function (req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).render('login.ejs', {
        errors: errors.array(),
        formData: { username: req.body.username }
      });
    }

    const { username, password } = req.body;

    // look up this user
    const sqlquery =
      'SELECT username, email, hashedPassword FROM users WHERE username = ?';
    db.query(sqlquery, [username], (err, result) => {
      if (err) {
        return next(err);
      }

      if (result.length === 0) {
        // user not found → log failed attempt
        const auditSql =
          'INSERT INTO audit (email, action, details) VALUES (?, ?, ?)';
        db.query(
          auditSql,
          [
            null,
            'login_failed',
            'Login failed: user not found for username ' + username
          ],
          (auditErr) => {
            if (auditErr) return next(auditErr);
            res.status(401).render('login.ejs', {
              errors: [{ msg: 'Login failed: user not found' }],
              formData: { username }
            });
          }
        );
      } else {
        const user = result[0];
        const hashedPassword = user.hashedPassword;

        bcrypt.compare(password, hashedPassword, function (err, match) {
          if (err) {
            return next(err);
          }

          if (match) {
            // success → put user into session
            req.session.user = {
              username: user.username,
              email: user.email
            };

            // log success
            const auditSql =
              'INSERT INTO audit (email, action, details) VALUES (?, ?, ?)';
            db.query(
              auditSql,
              [user.email, 'login_success', 'Successful login for ' + username],
              (auditErr) => {
                if (auditErr) return next(auditErr);
                res.redirect('/'); // back to home page
              }
            );
          } else {
            // wrong password → log failed
            const auditSql =
              'INSERT INTO audit (email, action, details) VALUES (?, ?, ?)';
            db.query(
              auditSql,
              [user.email, 'login_failed', 'Login failed: wrong password for ' + username],
              (auditErr) => {
                if (auditErr) return next(auditErr);
                res.status(401).render('login.ejs', {
                  errors: [{ msg: 'Login failed: incorrect password' }],
                  formData: { username }
                });
              }
            );
          }
        });
      }
    });
  }
);

// ========== LOGOUT ==========

router.get('/logout', function (req, res, next) {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ========== AUDIT HISTORY PAGE ==========

router.get('/audit', function (req, res, next) {
  const sqlquery =
    'SELECT email, action, details, created_at FROM audit ORDER BY created_at DESC';

  db.query(sqlquery, (err, result) => {
    if (err) {
      return next(err);
    }
    res.render('audit.ejs', { auditRows: result });
  });
});

module.exports = router;
