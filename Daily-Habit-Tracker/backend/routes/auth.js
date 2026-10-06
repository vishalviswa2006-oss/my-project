const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be configured.');
  }
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      name: user.name
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string' || !name.trim() || !email.trim() || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }

  if (name.trim().length > 100 || email.trim().length > 255 || password.length < 8) {
    return res.status(400).json({ message: 'Use a name up to 100 characters, a valid email, and a password of at least 8 characters.' });
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    const [existingUser] = await pool.execute('SELECT id FROM users WHERE email = ?', [trimmedEmail]);

    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), trimmedEmail, passwordHash]
    );

    const user = {
      id: result.insertId,
      name: name.trim(),
      email: trimmedEmail
    };

    const token = createToken(user);

    return res.status(201).json({
      message: 'Registration successful.',
      token,
      user
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Unable to register account.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const trimmedEmail = email.trim().toLowerCase();
    const [rows] = await pool.execute('SELECT id, name, email, password FROM users WHERE email = ?', [trimmedEmail]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = createToken({ id: user.id, email: user.email, name: user.name });

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Unable to login.' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.json({ user: rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Unable to load profile.' });
  }
});

router.post('/logout', (req, res) => {
  return res.json({ message: 'Logout successful.' });
});

module.exports = router;
