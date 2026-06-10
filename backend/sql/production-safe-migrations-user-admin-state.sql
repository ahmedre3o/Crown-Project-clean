-- User admin state (disable/enable) source of truth
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS user_admin_state (
  user_id INT NOT NULL,
  disabled TINYINT(1) NOT NULL DEFAULT 0,
  disabled_at TIMESTAMP NULL,
  disabled_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_admin_state_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mirror flag on users (list + login checks). Runtime also runs ALTER if missing.
-- If this line errors with ER_DUP_FIELDNAME, the column already exists — skip.
ALTER TABLE users ADD COLUMN is_disabled TINYINT(1) NOT NULL DEFAULT 0;
