const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware');

const router = express.Router();
router.use(authenticate);

router.post('/:habitId/toggle', async (req, res) => {
  const { habitId } = req.params;
  const userId = req.user.userId;
  if (!/^\d+$/.test(habitId)) {
    return res.status(400).json({ message: 'Invalid habit ID.' });
  }

  try {
    const [habits] = await pool.execute(
      `SELECT id, frequency,
              (SELECT COUNT(*) FROM habit_logs
               WHERE habit_id = habits.id AND user_id = ? AND completed = 1
                 AND YEARWEEK(completed_date, 1) = YEARWEEK(CURDATE(), 1)) AS completed_this_week
       FROM habits WHERE id = ? AND user_id = ?`,
      [userId, habitId, userId]
    );
    if (!habits.length) {
      return res.status(404).json({ message: 'Habit not found.' });
    }
    const habit = habits[0];
    if (habit.frequency === 'weekdays') {
      const [dayRows] = await pool.execute('SELECT DAYOFWEEK(CURDATE()) AS day_of_week');
      if (dayRows[0].day_of_week === 1 || dayRows[0].day_of_week === 7) {
        return res.status(400).json({ message: 'This habit is scheduled for weekdays.' });
      }
    }

    const [todayRows] = await pool.execute(
      'SELECT completed FROM habit_logs WHERE habit_id = ? AND user_id = ? AND completed_date = CURDATE()',
      [habitId, userId]
    );
    const currentlyCompleted = todayRows.length > 0 && Boolean(todayRows[0].completed);
    if (habit.frequency === 'weekly' && !currentlyCompleted && Number(habit.completed_this_week) > 0) {
      return res.status(400).json({ message: 'This weekly habit is already complete for this week.' });
    }

    await pool.execute(
      `INSERT INTO habit_logs (habit_id, user_id, completed_date, completed)
       VALUES (?, ?, CURDATE(), 1)
       ON DUPLICATE KEY UPDATE completed = IF(completed = 1, 0, 1)`,
      [habitId, userId]
    );
    const [resultRows] = await pool.execute(
      'SELECT completed FROM habit_logs WHERE habit_id = ? AND user_id = ? AND completed_date = CURDATE()',
      [habitId, userId]
    );
    const completed = Boolean(resultRows[0].completed);
    return res.json({
      message: completed ? 'Habit marked complete.' : 'Habit marked incomplete.',
      isCompletedToday: completed
    });
  } catch (error) {
    console.error('Toggle progress error:', error);
    return res.status(500).json({ message: 'Unable to update habit progress.' });
  }
});

router.get('/stats', async (req, res) => {
  const userId = req.user.userId;
  try {
    const [habits] = await pool.execute(
      'SELECT id, frequency FROM habits WHERE user_id = ?',
      [userId]
    );
    const [todayRows] = await pool.execute(
      `SELECT h.frequency,
              COALESCE(MAX(CASE WHEN hl.completed_date = CURDATE() AND hl.completed = 1 THEN 1 ELSE 0 END), 0) AS completed,
              COALESCE(SUM(CASE
                WHEN hl.completed_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                 AND hl.completed = 1 THEN 1 ELSE 0 END), 0) AS completed_this_week
       FROM habits h
       LEFT JOIN habit_logs hl
         ON hl.habit_id = h.id AND hl.user_id = h.user_id
       WHERE h.user_id = ?
       GROUP BY h.id, h.frequency`,
      [userId]
    );
    const [logs] = await pool.execute(
      `SELECT DATE_FORMAT(completed_date, '%Y-%m-%d') AS completed_date, habit_id
       FROM habit_logs
       WHERE user_id = ? AND completed = 1
       ORDER BY completed_date ASC`,
      [userId]
    );
    const [allTimeRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM habit_logs WHERE user_id = ? AND completed = 1',
      [userId]
    );
    const [weeklyLogs] = await pool.execute(
      `SELECT DATE_FORMAT(completed_date, '%Y-%m-%d') AS completed_date, habit_id,
              DATE_FORMAT(completed_date, '%a') AS day_label
       FROM habit_logs
       WHERE user_id = ? AND completed = 1 AND completed_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       ORDER BY completed_date ASC`,
      [userId]
    );
    const [calendar] = await pool.execute(
      `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today,
              DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 6 DAY), '%Y-%m-%d') AS week_start`
    );

    const todayCount = todayRows.filter((row) => Number(row.completed) === 1).length;
    const todayDate = calendar[0].today;
    const [weekdayRows] = await pool.execute('SELECT DAYOFWEEK(CURDATE()) AS day_of_week');
    const isWeekday = weekdayRows[0].day_of_week >= 2 && weekdayRows[0].day_of_week <= 6;
    const dueToday = todayRows.filter((row) => (
      row.frequency === 'daily'
      || (row.frequency === 'weekdays' && isWeekday)
      || (row.frequency === 'weekly' && (Number(row.completed_this_week) === 0 || Number(row.completed) === 1))
    )).length;
    const dateSet = new Set(logs.map((row) => row.completed_date));
    const orderedDates = [...dateSet].sort();
    const streaks = [];
    let streak = 0;
    let previous = null;
    for (const value of orderedDates) {
      const date = new Date(`${value}T00:00:00Z`);
      const day = date.getTime();
      if (previous !== null && day - previous === 86400000) {
        streak += 1;
      } else {
        if (streak) streaks.push(streak);
        streak = 1;
      }
      previous = day;
    }
    if (streak) streaks.push(streak);
    const lastCompleted = orderedDates[orderedDates.length - 1];
    let currentStreak = 0;
    if (lastCompleted) {
      const yesterday = new Date(`${todayDate}T00:00:00Z`);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayString = yesterday.toISOString().slice(0, 10);
      if (lastCompleted === todayDate || lastCompleted === yesterdayString) {
        let cursor = new Date(`${todayDate}T00:00:00Z`);
        if (!dateSet.has(todayDate)) cursor.setUTCDate(cursor.getUTCDate() - 1);
        while (dateSet.has(cursor.toISOString().slice(0, 10))) {
          currentStreak += 1;
          cursor.setUTCDate(cursor.getUTCDate() - 1);
        }
      }
    }

    const completedByDate = new Map();
    for (const row of weeklyLogs) {
      completedByDate.set(row.completed_date, (completedByDate.get(row.completed_date) || 0) + 1);
    }
    const week = [];
    const weekStart = new Date(`${calendar[0].week_start}T00:00:00Z`);
    for (let index = 0; index < 7; index += 1) {
      const date = new Date(weekStart);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      week.push({
        date: key,
        label: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        completed: completedByDate.get(key) || 0,
        total: habits.length
      });
    }
    const weeklyGoal = habits.reduce((sum, habit) => (
      sum + (habit.frequency === 'weekly' ? 1 : habit.frequency === 'weekdays' ? 5 : 7)
    ), 0);
    const weeklyDone = weeklyLogs.length;
    const weeklyPercentage = weeklyGoal ? Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100)) : 0;

    return res.json({
      totalHabits: habits.length,
      completedToday: todayCount,
      todayTotal: dueToday,
      completionPercentage: dueToday ? Math.round((todayCount / dueToday) * 100) : 0,
      currentStreak,
      longestStreak: streaks.length ? Math.max(...streaks) : 0,
      weeklyDone,
      weeklyGoal,
      weeklyPercentage,
      allTimeCompletions: Number(allTimeRows[0].total),
      weeklyProgress: week,
      today: todayDate
    });
  } catch (error) {
    console.error('Get progress stats error:', error);
    return res.status(500).json({ message: 'Unable to load progress statistics.' });
  }
});

module.exports = router;
