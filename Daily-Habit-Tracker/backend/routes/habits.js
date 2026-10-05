const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();

const getTodayString = () => new Date().toISOString().slice(0, 10);

const getCurrentStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;

  const dateSet = new Set(completedDates.map((date) => date.toISOString ? date.toISOString().slice(0, 10) : String(date).slice(0, 10)));
  let streak = 0;
  let cursor = new Date();

  if (!dateSet.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

router.get('/summary', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const today = getTodayString();

  try {
    const [totalRows] = await pool.execute('SELECT COUNT(*) AS total FROM habits WHERE user_id = ?', [userId]);
    const [completedRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM habit_logs hl
       INNER JOIN habits h ON h.id = hl.habit_id
       WHERE h.user_id = ? AND hl.completed_date = ? AND hl.completed = 1`,
      [userId, today]
    );

    const [daysRows] = await pool.execute(
      `SELECT DISTINCT DATE(hl.completed_date) AS completed_day
       FROM habit_logs hl
       INNER JOIN habits h ON h.id = hl.habit_id
       WHERE h.user_id = ? AND hl.completed = 1
       ORDER BY completed_day DESC`,
      [userId]
    );

    const completedDates = daysRows.map((row) => new Date(`${row.completed_day}T00:00:00`));
    const streak = getCurrentStreak(completedDates);
    const totalHabits = Number(totalRows[0].total || 0);
    const completedToday = Number(completedRows[0].total || 0);
    const totalCompleted = completedDates.length;
    const progress = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;

    return res.json({
      totalHabits,
      completedToday,
      totalCompleted,
      streak,
      progress,
      today: today
    });
  } catch (error) {
    console.error('Habit summary error:', error);
    return res.status(500).json({ message: 'Unable to load habit summary.' });
  }
});

router.get('/', authenticate, async (req, res) => {
  const userId = req.user.userId;
  const today = getTodayString();

  try {
    const [rows] = await pool.execute(
      `SELECT h.id, h.habit_name, h.created_at,
              MAX(CASE WHEN hl.completed_date = ? AND hl.completed = 1 THEN 1 ELSE 0 END) AS is_completed_today,
              COUNT(hl.id) AS total_completions
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id
       WHERE h.user_id = ?
       GROUP BY h.id, h.habit_name, h.created_at
       ORDER BY h.created_at DESC`,
      [today, userId]
    );

    const habits = rows.map((habit) => ({
      id: habit.id,
      name: habit.habit_name,
      createdAt: habit.created_at,
      isCompletedToday: Number(habit.is_completed_today) === 1,
      totalCompletions: Number(habit.total_completions || 0)
    }));

    return res.json({ habits });
  } catch (error) {
    console.error('Get habits error:', error);
    return res.status(500).json({ message: 'Unable to load habits.' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { habitName } = req.body;
  const userId = req.user.userId;

  if (!habitName || !habitName.trim()) {
    return res.status(400).json({ message: 'Habit name is required.' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO habits (user_id, habit_name) VALUES (?, ?)',
      [userId, habitName.trim()]
    );

    const [rows] = await pool.execute('SELECT id, habit_name, created_at FROM habits WHERE id = ?', [result.insertId]);
    const habit = rows[0];

    return res.status(201).json({
      message: 'Habit added successfully.',
      habit: {
        id: habit.id,
        name: habit.habit_name,
        createdAt: habit.created_at,
        isCompletedToday: false,
        totalCompletions: 0
      }
    });
  } catch (error) {
    console.error('Create habit error:', error);
    return res.status(500).json({ message: 'Unable to add habit.' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { habitName } = req.body;
  const userId = req.user.userId;

  if (!habitName || !habitName.trim()) {
    return res.status(400).json({ message: 'Habit name is required.' });
  }

  try {
    const [rows] = await pool.execute('SELECT id FROM habits WHERE id = ? AND user_id = ?', [id, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found.' });
    }

    await pool.execute('UPDATE habits SET habit_name = ? WHERE id = ?', [habitName.trim(), id]);

    return res.json({ message: 'Habit updated successfully.' });
  } catch (error) {
    console.error('Update habit error:', error);
    return res.status(500).json({ message: 'Unable to update habit.' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const [rows] = await pool.execute('SELECT id FROM habits WHERE id = ? AND user_id = ?', [id, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Habit not found.' });
    }

    await pool.execute('DELETE FROM habits WHERE id = ?', [id]);
    return res.json({ message: 'Habit deleted successfully.' });
  } catch (error) {
    console.error('Delete habit error:', error);
    return res.status(500).json({ message: 'Unable to delete habit.' });
  }
});

router.post('/:id/toggle', authenticate, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;
  const today = getTodayString();

  try {
    const [habitRows] = await pool.execute('SELECT id FROM habits WHERE id = ? AND user_id = ?', [id, userId]);

    if (habitRows.length === 0) {
      return res.status(404).json({ message: 'Habit not found.' });
    }

    const [logRows] = await pool.execute(
      'SELECT id, completed FROM habit_logs WHERE habit_id = ? AND completed_date = ?',
      [id, today]
    );

    if (logRows.length === 0) {
      const [insertResult] = await pool.execute(
        'INSERT INTO habit_logs (habit_id, completed_date, completed) VALUES (?, ?, 1)',
        [id, today]
      );

      return res.status(201).json({
        message: 'Habit marked as completed.',
        isCompletedToday: true,
        logId: insertResult.insertId
      });
    }

    const nextCompleted = logRows[0].completed === 1 ? 0 : 1;
    await pool.execute('UPDATE habit_logs SET completed = ? WHERE id = ?', [nextCompleted, logRows[0].id]);

    return res.json({
      message: nextCompleted ? 'Habit marked as completed.' : 'Habit unmarked for today.',
      isCompletedToday: Boolean(nextCompleted)
    });
  } catch (error) {
    console.error('Toggle habit error:', error);
    return res.status(500).json({ message: 'Unable to update habit status.' });
  }
});

module.exports = router;
