# Daily Habit Tracker

A beginner-friendly habit tracking web app built with Node.js, Express, MySQL, HTML, CSS, and vanilla JavaScript.

## Features

- User registration and login
- JWT-based authentication
- Protected habit dashboard
- Add, edit, delete, and toggle habits
- Daily completion tracking with MySQL
- Current streak and progress statistics
- User-specific habits so one user cannot see another user's data
- Responsive modern UI

## Project structure

- `backend/` – Express API, database config, and MySQL scripts
- `frontend/` – login page, registration page, dashboard, CSS, and client-side JavaScript

## Setup

1. Start MySQL and create a database user if needed.
2. Open the MySQL client and run the SQL in `backend/database.sql`.
3. Update `backend/.env` with your local database settings.
4. Open a terminal in `backend`.
5. Install dependencies:

   npm install

6. Start the app:

   npm start

7. Visit:

   http://localhost:5000

## Default environment file

The project includes `backend/.env.example` and a local `.env` file:

- `PORT=5000`
- `DB_HOST=localhost`
- `DB_USER=root`
- `DB_PASSWORD=`
- `DB_NAME=daily_habit_tracker`
- `JWT_SECRET=daily-habit-tracker-secret-key`

Update the database credentials to match your MySQL setup if needed.

## Notes

- The backend serves the frontend from the same Express server.
- No separate frontend server is required.
- All habit data is stored in MySQL.
