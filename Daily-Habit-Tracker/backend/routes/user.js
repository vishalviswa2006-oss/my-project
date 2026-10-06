const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();
router.use(authenticate);

router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );
    if (!rows.length) {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.json({ user: rows[0] });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: 'Unable to load profile.' });
  }
});

router.put('/profile', async (req, res) => {
  const { name, email, currentPassword, newPassword } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ message: 'Name must be between 1 and 100 characters.' });
  }
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 255) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }
  if ((currentPassword || newPassword) && (
    typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8
  )) {
    return res.status(400).json({ message: 'Enter your current password and a new password of at least 8 characters.' });
  }

  try {
    if (currentPassword || newPassword) {
      const [userRows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.userId]);
      if (!userRows.length) {
        return res.status(404).json({ message: 'User not found.' });
      }
      if (!(await bcrypt.compare(currentPassword, userRows[0].password))) {
        return res.status(400).json({ message: 'Current password is incorrect.' });
      }
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.execute(
        'UPDATE users SET name = ?, email = ?, password = ? WHERE id = ?',
        [name.trim(), email.trim().toLowerCase(), passwordHash, req.user.userId]
      );
    } else {
      await pool.execute(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name.trim(), email.trim().toLowerCase(), req.user.userId]
      );
    }
    const [rows] = await pool.execute(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );
    return res.json({ message: 'Profile updated successfully.', user: rows[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Unable to update profile.' });
  }
});

module.exports = router;
