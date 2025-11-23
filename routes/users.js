const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

// ----------------------
// REGISTRATION
// ----------------------

// GET registration form
router.get('/register', function (req, res, next) {
  res.render('register.ejs');
});

// POST registration
router.post('/registered', function (req, res, next) {
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
        email +
        '<br>Your password is: ' +
        password +
        '<br>Your hashed password is: ' +
        hashedPassword;

      res.send(output);
    });
  });
});

// ----------------------
// LIST USERS (no passwords)
// ----------------------
router.get('/list', function (req, res, next) {
  const sqlquery = 'SELECT username, first, last, email FROM users';

  db.query(sqlquery, (err, result) => {
    if (err) {
      return next(err);
    }
    res.render('userlist.ejs', { users: result });
  });
});

// ----------------------
// LOGIN + AUDIT LOGGING
// ----------------------

// LOGIN form
router.get('/login', function (req, res, next) {
  res.render('login.ejs');
});

// HANDLE login
router.post('/loggedin', function (req, res, next) {
  const { username, password } = req.body;

  // 1. Look up this user (and their email + hashed password)
  const sqlquery =
    'SELECT username, email, hashedPassword FROM users WHERE username = ?';

  db.query(sqlquery, [username], (err, result) => {
    if (err) {
      return next(err);
    }

    // helper to write to audit table
    function writeAudit(emailValue, action, details, cb) {
      const auditSql =
        'INSERT INTO audit (email, action, details) VALUES (?, ?, ?)';
      db.query(auditSql, [emailValue, action, details], cb);
    }

    if (result.length === 0) {
      // user not found
      writeAudit(
        username,                  // we store the username in the email column
        'login_failed',
        'Login failed: user not found',
        (auditErr) => {
          if (auditErr) return next(auditErr);
          res.send('Login failed: user not found');
        }
      );
    } else {
      const user = result[0];
      const hashedPassword = user.hashedPassword;

      // 2. Compare submitted password with hashed password
      bcrypt.compare(password, hashedPassword, function (err, match) {
        if (err) {
          return next(err);
        }

        if (match) {
          // successful login
          writeAudit(
            user.email,
            'login_success',
            'Login successful',
            (auditErr) => {
              if (auditErr) return next(auditErr);
              res.send('Login successful! Welcome, ' + user.username);
            }
          );
        } else {
          // wrong password
          writeAudit(
            user.email,
            'login_failed',
            'Login failed: incorrect password',
            (auditErr) => {
              if (auditErr) return next(auditErr);
              res.send('Login failed: incorrect password');
            }
          );
        }
      });
    }
  });
});

// ----------------------
// SHOW AUDIT HISTORY
// ----------------------
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
