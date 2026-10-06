CREATE DATABASE IF NOT EXISTS daily_habits_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE daily_habits_tracker;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS habits (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NOT NULL DEFAULT '',
  category VARCHAR(50) NOT NULL DEFAULT 'Personal',
  frequency ENUM('daily', 'weekdays', 'weekly') NOT NULL DEFAULT 'daily',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_habits_user_id (user_id),
  CONSTRAINT fk_habits_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS habit_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  habit_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  completed_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_habit_user_date (habit_id, user_id, completed_date),
  KEY idx_habit_logs_user_date (user_id, completed_date),
  CONSTRAINT fk_habit_logs_habit FOREIGN KEY (habit_id)
    REFERENCES habits(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_habit_logs_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
