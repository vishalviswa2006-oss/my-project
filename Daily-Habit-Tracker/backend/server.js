const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });

const pool = require('./db');
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const progressRoutes = require('./routes/progress');
const userRoutes = require('./routes/user');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.json({
    name: 'Daily Habits Tracker API',
    frontend: 'http://localhost:5173',
    health: '/api/health'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check database error:', error);
    return res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required. Set it in backend/.env before starting the server.');
  process.exit(1);
}

app.listen(PORT, async () => {
  console.log(`Daily Habit Tracker running on http://localhost:${PORT}`);

  try {
    await pool.query('SELECT 1');
    console.log('MySQL connection is active.');
  } catch (error) {
    console.error('MySQL connection failed. Please check your .env and database setup.');
    console.error(error.message);
  }
});
