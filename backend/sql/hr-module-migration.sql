-- HR module (run manually or via deploy pipeline). All tables scoped by shop_id.
-- Physical names use hr_ prefix to avoid collisions.

CREATE TABLE IF NOT EXISTS hr_employees (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NULL,
  role VARCHAR(128) NULL,
  salary_type ENUM('monthly','daily') NOT NULL DEFAULT 'monthly',
  salary_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  working_hours_per_day DECIMAL(8,2) NOT NULL DEFAULT 8,
  overtime_rate_per_hour DECIMAL(14,2) NOT NULL DEFAULT 0,
  hire_date DATE NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hr_employees_shop (shop_id),
  INDEX idx_hr_employees_shop_status (shop_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_attendance (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  check_in DATETIME NULL,
  check_out DATETIME NULL,
  total_hours DECIMAL(10,4) NULL,
  overtime_hours DECIMAL(10,4) NULL DEFAULT 0,
  status ENUM('present','absent','leave') NOT NULL DEFAULT 'present',
  source ENUM('manual','fingerprint','face') NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hr_attendance_emp_date (shop_id, employee_id, date),
  INDEX idx_hr_att_shop_date (shop_id, date),
  CONSTRAINT fk_hr_att_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_devices (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('fingerprint','face') NOT NULL DEFAULT 'fingerprint',
  api_url VARCHAR(512) NULL,
  api_secret VARCHAR(128) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hr_dev_shop (shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_payroll (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  month CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  base_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  attendance_days INT NOT NULL DEFAULT 0,
  absent_days INT NOT NULL DEFAULT 0,
  overtime_hours DECIMAL(12,4) NOT NULL DEFAULT 0,
  overtime_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  deductions DECIMAL(14,2) NOT NULL DEFAULT 0,
  bonuses DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_salary DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid TINYINT(1) NOT NULL DEFAULT 0,
  paid_at DATETIME NULL,
  journal_entry_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hr_payroll_emp_month (shop_id, employee_id, month),
  INDEX idx_hr_pay_shop_month (shop_id, month),
  CONSTRAINT fk_hr_pay_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_employee_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  login_time DATETIME NOT NULL,
  logout_time DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hr_sess_shop (shop_id),
  INDEX idx_hr_sess_emp (employee_id),
  CONSTRAINT fk_hr_sess_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: link app user to HR employee (for hr_employee role / session tracking)
-- ALTER TABLE users ADD COLUMN hr_employee_id BIGINT UNSIGNED NULL AFTER shop_id;
-- CREATE INDEX idx_users_hr_employee ON users (hr_employee_id);

-- Leave balance system (run via ensureHrTablesOnce)
-- ALTER TABLE hr_employees ADD COLUMN annual_leave_limit INT NOT NULL DEFAULT 21;
-- ALTER TABLE hr_attendance ADD COLUMN leave_type ENUM('annual','sick','emergency','maternity') NULL;
-- ALTER TABLE hr_payroll ADD COLUMN leave_days INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS hr_leave_entries (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shop_id BIGINT UNSIGNED NOT NULL,
  employee_id BIGINT UNSIGNED NOT NULL,
  leave_type ENUM('annual','sick','emergency','maternity') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(10,2) NOT NULL DEFAULT 0,
  leave_year INT NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hr_leave_shop_emp (shop_id, employee_id),
  INDEX idx_hr_leave_year (shop_id, leave_year),
  CONSTRAINT fk_hr_leave_emp FOREIGN KEY (employee_id) REFERENCES hr_employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
