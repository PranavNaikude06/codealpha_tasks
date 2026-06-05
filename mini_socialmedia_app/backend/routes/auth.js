const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, email, password, bio = '', avatar_url = '' } = req.body;

    try {
      // Check if username taken
      const byUsername = await db.asyncGet('SELECT id FROM users WHERE username = ?', [username]);
      if (byUsername) return res.status(400).json({ error: 'Username already taken' });

      const byEmail = await db.asyncGet('SELECT id FROM users WHERE email = ?', [email]);
      if (byEmail) return res.status(400).json({ error: 'Email already registered' });

      const hashed = await bcrypt.hash(password, 10);
      const result = await db.asyncRun(
        'INSERT INTO users (username, email, password, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
        [username, email, hashed, bio, avatar_url]
      );

      const token = jwt.sign({ userId: result.lastID }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      const user = await db.asyncGet(
        'SELECT id, username, email, bio, avatar_url, created_at FROM users WHERE id = ?',
        [result.lastID]
      );

      return res.status(201).json({ token, user });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const user = await db.asyncGet('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) return res.status(401).json({ error: 'Invalid email or password' });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      const { password: _pw, ...safeUser } = user;
      return res.status(200).json({ token, user: safeUser });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
