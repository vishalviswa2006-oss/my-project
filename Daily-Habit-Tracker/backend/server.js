const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const pool = require('./db');
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const frontendDir = path.join(__dirname, '../frontend');

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);

app.use(express.static(frontendDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'login.html'));
});

app.get('/register.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'register.html'));
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

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
