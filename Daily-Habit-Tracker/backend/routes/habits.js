const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();
const frequencies = new Set(['daily', 'weekdays', 'weekly']);

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT h.id, h.name, h.description, h.category, h.frequency, h.created_at,
              COALESCE(SUM(CASE WHEN hl.completed = 1 THEN 1 ELSE 0 END), 0) AS total_completions,
              COALESCE(MAX(CASE WHEN hl.completed_date = CURDATE() AND hl.completed = 1 THEN 1 ELSE 0 END), 0) AS is_completed_today,
              COALESCE(MAX(CASE
                WHEN hl.completed_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                 AND hl.completed = 1 THEN 1 ELSE 0 END), 0) AS is_completed_this_week,
              CASE
                WHEN h.frequency = 'daily' THEN 1
                WHEN h.frequency = 'weekdays' AND DAYOFWEEK(CURDATE()) BETWEEN 2 AND 6 THEN 1
                WHEN h.frequency = 'weekly' AND COALESCE(SUM(
                  CASE WHEN hl.completed_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                       AND hl.completed = 1 THEN 1 ELSE 0 END
                ), 0) = 0 THEN 1
                ELSE 0
              END AS is_due_today
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.user_id = h.user_id
       WHERE h.user_id = ?
       GROUP BY h.id, h.name, h.description, h.category, h.frequency, h.created_at
       ORDER BY h.created_at DESC, h.id DESC`,
      [req.user.userId]
    );
    return res.json({
      habits: rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        frequency: row.frequency,
        createdAt: row.created_at,
        totalCompletions: Number(row.total_completions),
        isCompletedToday: Boolean(row.is_completed_today),
        isCompletedThisWeek: Boolean(row.is_completed_this_week),
        isDueToday: Boolean(row.is_due_today)
      }))
    });
  } catch (error) {
    console.error('Get habits error:', error);
    return res.status(500).json({ message: 'Unable to load habits.' });
  }
});

router.post('/', async (req, res) => {
  const { name, description = '', category = 'Personal', frequency = 'daily' } = req.body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ message: 'Habit name must be between 1 and 100 characters.' });
  }
  if (typeof description !== 'string' || description.length > 500) {
    return res.status(400).json({ message: 'Description must be 500 characters or fewer.' });
  }
  if (typeof category !== 'string' || !category.trim() || category.trim().length > 50) {
    return res.status(400).json({ message: 'Category must be between 1 and 50 characters.' });
  }
  if (!frequencies.has(frequency)) {
    return res.status(400).json({ message: 'Frequency must be daily, weekdays, or weekly.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO habits (user_id, name, description, category, frequency) VALUES (?, ?, ?, ?, ?)',
      [req.user.userId, name.trim(), description.trim(), category.trim(), frequency]
    );
    const [rows] = await pool.execute(
      'SELECT id, name, description, category, frequency, created_at FROM habits WHERE id = ? AND user_id = ?',
      [result.insertId, req.user.userId]
    );
    const habit = rows[0];
    return res.status(201).json({
      habit: {
        id: habit.id,
        name: habit.name,
        description: habit.description,
        category: habit.category,
        frequency: habit.frequency,
        createdAt: habit.created_at,
        totalCompletions: 0,
        isCompletedToday: false
      }
    });
  } catch (error) {
    console.error('Create habit error:', error);
    return res.status(500).json({ message: 'Unable to create habit.' });
  }
});

router.put('/:id', async (req, res) => {
  const { name, description = '', category = 'Personal', frequency = 'daily' } = req.body;
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ message: 'Invalid habit ID.' });
  }
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return res.status(400).json({ message: 'Habit name must be between 1 and 100 characters.' });
  }
  if (typeof description !== 'string' || description.length > 500) {
    return res.status(400).json({ message: 'Description must be 500 characters or fewer.' });
  }
  if (typeof category !== 'string' || !category.trim() || category.trim().length > 50) {
    return res.status(400).json({ message: 'Category must be between 1 and 50 characters.' });
  }
  if (!frequencies.has(frequency)) {
    return res.status(400).json({ message: 'Frequency must be daily, weekdays, or weekly.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE habits SET name = ?, description = ?, category = ?, frequency = ? WHERE id = ? AND user_id = ?',
      [name.trim(), description.trim(), category.trim(), frequency, req.params.id, req.user.userId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Habit not found.' });
    }
    return res.json({ message: 'Habit updated successfully.' });
  } catch (error) {
    console.error('Update habit error:', error);
    return res.status(500).json({ message: 'Unable to update habit.' });
  }
});

router.delete('/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) {
    return res.status(400).json({ message: 'Invalid habit ID.' });
  }
  try {
    const [result] = await pool.execute(
      'DELETE FROM habits WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Habit not found.' });
    }
    return res.json({ message: 'Habit deleted successfully.' });
  } catch (error) {
    console.error('Delete habit error:', error);
    return res.status(500).json({ message: 'Unable to delete habit.' });
  }
});

module.exports = router;
