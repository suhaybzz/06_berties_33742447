const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

// -------------------------
// Helper: basic validation
// -------------------------
function validateRegistration(body) {
  const errors = [];
  const { username, first, last, email, password } = body;

  if (!username || username.trim() === '') {
    errors.push('Username is required');
  }
  if (!email || email.trim() === '') {
    errors.push('Email is required');
  }
  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  // first/last are optional in this simple version

  return errors;
}

// -------------------------
// GET registration form
// -------------------------
router.get('/register', (req, res) => {
  res.render('register.ejs', {
    errors: [],
    data: {}, // used to pre-fill fields
  });
});

// -------------------------
// POST registration
// -------------------------
router.post('/registered', (req, res, next) => {
  const { username, first, last, email, password } = req.body;
  const errors = validateRegistration(req.body);
  const data = { username, first, last, email };

  if (errors.length > 0) {
    // validation failed – re-show form with errors + previously entered data
    return res.status(400).render('register.ejs', { errors, data });
  }

  // Check if username already exists
  const checkSql = 'SELECT id FROM users WHERE username = ?';
  db.query(checkSql, [username], (err, rows) => {
    if (err) return next(err);

    if (rows.length > 0) {
      return res
        .status(400)
        .render('register.ejs', {
          errors: ['That username is already taken'],
          data,
        });
    }

    // Hash password and insert user
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
      if (err) return next(err);

      const insertUserSql =
        'INSERT INTO users (username, first, last, email, hashedPassword) VALUES (?, ?, ?, ?, ?)';
      const newrecord = [username, first, last, email, hashedPassword];

      db.query(insertUserSql, newrecord, (err2) => {
        if (err2) return next(err2);

        // Optional: log registration in audit table
        const auditSql =
          'INSERT INTO audit (email, username, action, success, details) VALUES (?, ?, ?, ?, ?)';
        db.query(
          auditSql,
          [email, username, 'register', true, 'User registered'],
          () => {
            // ignore audit errors
            res.send(
              `Hello ${first || ''} ${last || ''}, you are now registered! We will send an email to you at ${email}.`
            );
          }
        );
      });
    });
  });
});

// -------------------------
// LIST USERS (no passwords)
// -------------------------
router.get('/list', (req, res, next) => {
  const sqlquery = 'SELECT username, first, last, email FROM users';

  db.query(sqlquery, (err, result) => {
    if (err) return next(err);
    res.render('userlist.ejs', { users: result });
  });
});

// -------------------------
// LOGIN FORM
// -------------------------
router.get('/login', (req, res) => {
  res.render('login.ejs', {
    errors: [],
    data: {},
  });
});

// -------------------------
// HANDLE LOGIN + AUDIT
// -------------------------
router.post('/loggedin', (req, res, next) => {
  const { username, password } = req.body;
  const data = { username };
  const errors = [];

  if (!username || username.trim() === '') {
    errors.push('Username is required');
  }
  if (!password || password === '') {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).render('login.ejs', { errors, data });
  }

  const sqlquery =
    'SELECT id, username, email, hashedPassword FROM users WHERE username = ?';
  db.query(sqlquery, [username], (err, result) => {
    if (err) return next(err);

    if (result.length === 0) {
      // user not found
      const auditSql =
        'INSERT INTO audit (email, username, action, success, details) VALUES (?, ?, ?, ?, ?)';
      db.query(
        auditSql,
        [null, username, 'login', false, 'Login failed: user not found'],
        () => {
          res
            .status(401)
            .render('login.ejs', {
              errors: ['Login failed: user not found'],
              data,
            });
        }
      );
      return;
    }

    const user = result[0];
    const hashedPassword = user.hashedPassword;

    bcrypt.compare(password, hashedPassword, (err2, match) => {
      if (err2) return next(err2);

      if (!match) {
        // wrong password
        const auditSql =
          'INSERT INTO audit (email, username, action, success, details) VALUES (?, ?, ?, ?, ?)';
        db.query(
          auditSql,
          [user.email, username, 'login', false, 'Login failed: wrong password'],
          () => {
            res
              .status(401)
              .render('login.ejs', {
                errors: ['Login failed: incorrect password'],
                data,
              });
          }
        );
        return;
      }

      // SUCCESS – store user in session
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
      };

      const auditSql =
        'INSERT INTO audit (email, username, action, success, details) VALUES (?, ?, ?, ?, ?)';
      db.query(
        auditSql,
        [user.email, username, 'login', true, 'Login successful'],
        () => {
          // redirect back to home page
          res.redirect('/');
        }
      );
    });
  });
});

// -------------------------
// LOGOUT
// -------------------------
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// -------------------------
// AUDIT HISTORY PAGE
// -------------------------
router.get('/audit', (req, res, next) => {
  const sqlquery =
    'SELECT email, username, action, success, time, details FROM audit ORDER BY time DESC';

  db.query(sqlquery, (err, result) => {
    if (err) return next(err);
    res.render('audit.ejs', { auditRows: result });
  });
});

module.exports = router;