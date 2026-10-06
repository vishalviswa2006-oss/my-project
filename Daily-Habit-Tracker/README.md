# Daily Habits Tracker

A full-stack daily habit tracker with a React/Vite frontend, Express API, and MySQL persistence.

## Requirements

- Node.js 18.18 or newer and npm
- MySQL 8.0 or newer

## MySQL setup

From the project root, create the database and tables with a MySQL account allowed to create databases:

```sh
mysql -u root -p < backend/database.sql
```

Create `backend/.env` from `backend/.env.example` and set the credentials for your MySQL installation, including `DB_NAME=daily_habits_tracker`. If `backend/.env` already exists, update it to use the new database and a MySQL account with access to it. Set `JWT_SECRET` to a long, random value. Do not commit `.env`.

## Start the backend

```sh
cd backend
npm install
npm start
```

The API listens on `http://localhost:5000`. Check its MySQL connection at `http://localhost:5000/api/health`.

## Start the frontend

In another terminal:

```sh
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend sends API requests to `http://localhost:5000/api`.

## Available features

- Register and sign in with bcrypt-hashed passwords and JWT-protected routes.
- Create, edit, delete, categorize, schedule, and complete habits.
- View today's schedule, daily completion, current and longest streaks, and a seven-day progress chart.
- Edit account details and optionally change the password.
- Responsive dashboard, habit list, progress, profile, login, and registration pages.

Private API requests use `Authorization: Bearer <token>`. The database setup script creates `daily_habits_tracker` and its users, habits, and habit_logs tables.

## API routes

| Method | Route | Access |
| --- | --- | --- |
| GET | `/api/health` | Public |
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | JWT |
| GET, POST | `/api/habits` | JWT |
| PUT, DELETE | `/api/habits/:id` | JWT |
| POST | `/api/progress/:habitId/toggle` | JWT |
| GET | `/api/progress/stats` | JWT |
| GET, PUT | `/api/user/profile` | JWT |
