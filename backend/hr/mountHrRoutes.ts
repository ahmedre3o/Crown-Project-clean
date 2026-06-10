/**
 * HR module routes — mounted from api.ts before app.listen.
 * Tables: hr_employees, hr_attendance, hr_devices, hr_payroll, hr_employee_sessions
 */
import type { Application, Response } from 'express';
import crypto from 'crypto';
import { ensureJournalColumns } from '../db';
import { getPlanFeaturesForBackend } from '../shared/plans';

export type HrMountDeps = {
  pool: any;
  authenticateToken: (req: any, res: Response, next: any) => void;
  getShopIdOrFail: (req: any, res: Response) => number | null;
  hasTable: (t: string) => Promise<boolean>;
  hasColumn: (t: string, c: string) => Promise<boolean>;
  ensureAccountingTables: () => Promise<void>;
};

/** Staff HR + linked app logins: include legacy hr_employee so API matches frontend nav (full HR module). */
const HR_STAFF_ROLES = ['super_admin', 'shop_owner', 'hr_manager', 'employee', 'hr_employee'];
const HR_BRANCH_ROLES = ['branch_manager', 'multi_branch_manager'];
const HR_PAYROLL_ROLES = HR_STAFF_ROLES;
/** App login role for linked staff (see users.hr_employee_id); legacy hr_employee still accepted */
const HR_SELF_ROLES = ['employee', 'hr_employee'] as const;
/** Dashboard, attendance (view), overtime, sessions, reports (non-payroll): staff + branch managers + linked employees */
const HR_OPS_ROLES = [...HR_STAFF_ROLES, ...HR_BRANCH_ROLES, ...HR_SELF_ROLES];
/** Manual check-in/out for another employee */
const HR_PUNCH_ROLES = [...HR_STAFF_ROLES, ...HR_BRANCH_ROLES];

function isEmployeeSelfRole(role: string): boolean {
  return role === 'employee' || role === 'hr_employee';
}

function requireHrRole(...allowed: string[]) {
  return (req: any, res: Response, next: any) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const plan = getPlanFeaturesForBackend(req.user.package || req.user.plan || 'bronze');
    if (!plan.hr) return res.status(403).json({ error: 'Feature not available in current plan' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

const HR_DEFAULT_TZ = process.env.HR_DEFAULT_TIMEZONE || 'Africa/Cairo';

function formatYmdInTz(d: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function adjustedEmployeeBase(emp: any): number {
  const raw = Number(emp.salary_amount) || 0;
  const pct = Number(emp.annual_raise_percent) || 0;
  const extra = Number(emp.annual_raise_amount) || 0;
  return raw * (1 + pct / 100) + extra;
}

export function mountHrRoutes(app: Application, deps: HrMountDeps): void {
  const { pool, authenticateToken, getShopIdOrFail, hasTable, hasColumn, ensureAccountingTables } = deps;

  let hrReady: Promise<void> | null = null;
  const ensureHrTablesOnce = async () => {
    if (!hrReady) {
      hrReady = (async () => {
        await pool.execute(`
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.execute(`
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.execute(`
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS hr_payroll (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            shop_id BIGINT UNSIGNED NOT NULL,
            employee_id BIGINT UNSIGNED NOT NULL,
            month CHAR(7) NOT NULL,
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.execute(`
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        await pool.execute(`
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
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        if (!(await hasColumn('users', 'hr_employee_id'))) {
          try {
            await pool.execute('ALTER TABLE users ADD COLUMN hr_employee_id BIGINT UNSIGNED NULL');
            await pool.execute('CREATE INDEX idx_users_hr_employee ON users (hr_employee_id)');
          } catch (e: any) {
            console.warn('[HR] users.hr_employee_id alter skipped:', e?.message || e);
          }
        }
        const hrEmpCols: [string, string][] = [
          ['annual_leave_limit', 'ALTER TABLE hr_employees ADD COLUMN annual_leave_limit INT NOT NULL DEFAULT 21'],
          ['monthly_bonus', 'ALTER TABLE hr_employees ADD COLUMN monthly_bonus DECIMAL(14,2) NOT NULL DEFAULT 0'],
          ['monthly_deduction', 'ALTER TABLE hr_employees ADD COLUMN monthly_deduction DECIMAL(14,2) NOT NULL DEFAULT 0'],
          [
            'extra_overtime_hours_per_day',
            'ALTER TABLE hr_employees ADD COLUMN extra_overtime_hours_per_day DECIMAL(10,4) NOT NULL DEFAULT 0',
          ],
          ['biometric_punch_code', 'ALTER TABLE hr_employees ADD COLUMN biometric_punch_code VARCHAR(64) NULL'],
          ['monthly_tax', 'ALTER TABLE hr_employees ADD COLUMN monthly_tax DECIMAL(14,2) NOT NULL DEFAULT 0'],
          ['monthly_insurance', 'ALTER TABLE hr_employees ADD COLUMN monthly_insurance DECIMAL(14,2) NOT NULL DEFAULT 0'],
          ['annual_raise_percent', 'ALTER TABLE hr_employees ADD COLUMN annual_raise_percent DECIMAL(10,4) NOT NULL DEFAULT 0'],
          ['annual_raise_amount', 'ALTER TABLE hr_employees ADD COLUMN annual_raise_amount DECIMAL(14,2) NOT NULL DEFAULT 0'],
        ];
        for (const [col, ddl] of hrEmpCols) {
          if (!(await hasColumn('hr_employees', col))) {
            try {
              await pool.execute(ddl);
            } catch (e: any) {
              if (e?.code !== 'ER_DUP_FIELDNAME') console.warn('[HR] hr_employees.' + col, e?.message || e);
            }
          }
        }
        if (!(await hasColumn('hr_attendance', 'leave_type'))) {
          try {
            await pool.execute(
              "ALTER TABLE hr_attendance ADD COLUMN leave_type ENUM('annual','sick','emergency','maternity') NULL"
            );
          } catch (e: any) {
            if (e?.code !== 'ER_DUP_FIELDNAME') console.warn('[HR] hr_attendance.leave_type', e?.message || e);
          }
        }
        const hrPayCols: [string, string][] = [
          ['leave_days', 'ALTER TABLE hr_payroll ADD COLUMN leave_days INT NOT NULL DEFAULT 0'],
          ['gross_salary', 'ALTER TABLE hr_payroll ADD COLUMN gross_salary DECIMAL(14,2) NOT NULL DEFAULT 0'],
          ['tax_amount', 'ALTER TABLE hr_payroll ADD COLUMN tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0'],
          ['insurance_amount', 'ALTER TABLE hr_payroll ADD COLUMN insurance_amount DECIMAL(14,2) NOT NULL DEFAULT 0'],
        ];
        for (const [col, ddl] of hrPayCols) {
          if (!(await hasColumn('hr_payroll', col))) {
            try {
              await pool.execute(ddl);
            } catch (e: any) {
              if (e?.code !== 'ER_DUP_FIELDNAME') console.warn('[HR] hr_payroll.' + col, e?.message || e);
            }
          }
        }
        try {
          await pool.execute(
            'CREATE INDEX idx_hr_emp_biometric ON hr_employees (shop_id, biometric_punch_code)'
          );
        } catch {
          /* exists */
        }
      })();
    }
    await hrReady;
  };

  async function getLinkedEmployeeId(userId: number, shopId: number): Promise<number | null> {
    if (!(await hasColumn('users', 'hr_employee_id'))) return null;
    const [rows] = await pool.execute(
      'SELECT hr_employee_id FROM users WHERE id = ? AND shop_id = ? LIMIT 1',
      [userId, shopId]
    );
    const v = Number((rows as any[])[0]?.hr_employee_id);
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  async function ensureSalaryAccount(conn: any, shopId: number): Promise<Map<string, number>> {
    const [existing] = await conn.execute('SELECT id, code FROM accounts WHERE shop_id = ?', [shopId]);
    const byCode = new Map<string, number>();
    for (const row of existing as any[]) byCode.set(String(row.code), row.id);
    const need = [
      { code: '6100', name: 'Salaries Expense', type: 'expense' },
      { code: '1000', name: 'Cash', type: 'asset' },
      { code: '1100', name: 'Bank', type: 'asset' },
    ];
    for (const a of need) {
      if (byCode.has(a.code)) continue;
      const [r] = await conn.execute(
        'INSERT INTO accounts (shop_id, code, name, type) VALUES (?, ?, ?, ?)',
        [shopId, a.code, a.name, a.type]
      );
      byCode.set(a.code, (r as any).insertId);
    }
    return byCode;
  }

  // ---------- Dashboard ----------
  app.get('/api/hr/dashboard', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const today = new Date().toISOString().slice(0, 10);
      if (isEmployeeSelfRole(req.user.role)) {
        const eid = await getLinkedEmployeeId(req.user.id, shopId);
        if (!eid) {
          return res.json({
            employeeCount: 0,
            presentToday: 0,
            absentToday: 0,
            unpaidPayrollTotal: 0,
          });
        }
        const [selfRows] = await pool.execute(
          `SELECT COUNT(*) AS c FROM hr_attendance
           WHERE shop_id = ? AND employee_id = ? AND date = ? AND status = 'present' AND check_in IS NOT NULL`,
          [shopId, eid, today]
        );
        const here = Number((selfRows as any[])[0]?.c ?? 0) > 0 ? 1 : 0;
        return res.json({
          employeeCount: 1,
          presentToday: here,
          absentToday: here ? 0 : 1,
          unpaidPayrollTotal: 0,
        });
      }

      const [[emp], [present], [absent], [payrollSum]] = await Promise.all([
        pool.execute(
          'SELECT COUNT(*) AS c FROM hr_employees WHERE shop_id = ? AND status = ?',
          [shopId, 'active']
        ),
        pool.execute(
          `SELECT COUNT(DISTINCT employee_id) AS c FROM hr_attendance
           WHERE shop_id = ? AND date = ? AND status = 'present' AND check_in IS NOT NULL`,
          [shopId, today]
        ),
        pool.execute(
          `SELECT COUNT(*) AS c FROM hr_employees e
           WHERE e.shop_id = ? AND e.status = 'active'
           AND NOT EXISTS (
             SELECT 1 FROM hr_attendance a
             WHERE a.shop_id = e.shop_id AND a.employee_id = e.id AND a.date = ? AND a.status = 'present' AND a.check_in IS NOT NULL
           )`,
          [shopId, today]
        ),
        pool.execute(
          `SELECT COALESCE(SUM(total_salary),0) AS s FROM hr_payroll WHERE shop_id = ? AND paid = 0`,
          [shopId]
        ),
      ]);
      res.json({
        employeeCount: Number((emp as any[])[0]?.c ?? 0),
        presentToday: Number((present as any[])[0]?.c ?? 0),
        absentToday: Number((absent as any[])[0]?.c ?? 0),
        unpaidPayrollTotal: Number((payrollSum as any[])[0]?.s ?? 0),
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'HR dashboard failed' });
    }
  });

  // ---------- Employees ----------
  app.get('/api/hr/employees', authenticateToken, requireHrRole(...HR_PUNCH_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const year = Number(req.query.year) || new Date().getFullYear();
      const [rows] = await pool.execute(
        `SELECT e.*,
          COALESCE(e.annual_leave_limit, 21) AS annual_leave_limit,
          COALESCE((SELECT SUM(l.days) FROM hr_leave_entries l WHERE l.shop_id = e.shop_id AND l.employee_id = e.id AND l.leave_year = ? AND l.leave_type = 'annual'), 0) AS leave_balance_used,
          GREATEST(0, COALESCE(e.annual_leave_limit, 21) - COALESCE((SELECT SUM(l.days) FROM hr_leave_entries l WHERE l.shop_id = e.shop_id AND l.employee_id = e.id AND l.leave_year = ? AND l.leave_type = 'annual'), 0)) AS leave_balance_available
         FROM hr_employees e WHERE e.shop_id = ? ORDER BY e.name ASC`,
        [year, year, shopId]
      );
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'List employees failed' });
    }
  });

  app.post('/api/hr/employees', authenticateToken, requireHrRole(...HR_STAFF_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const b = req.body || {};
      const punchRaw = b.biometric_punch_code != null ? String(b.biometric_punch_code).trim() : '';
      const punchCode = punchRaw === '' ? null : punchRaw.slice(0, 64);
      const annualLimit = Number(b.annual_leave_limit) > 0 ? Number(b.annual_leave_limit) : 21;
      const [r] = await pool.execute(
        `INSERT INTO hr_employees (shop_id, name, phone, role, salary_type, salary_amount, working_hours_per_day, overtime_rate_per_hour, annual_leave_limit, monthly_bonus, monthly_deduction, extra_overtime_hours_per_day, monthly_tax, monthly_insurance, annual_raise_percent, annual_raise_amount, biometric_punch_code, hire_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shopId,
          String(b.name || '').trim(),
          b.phone != null ? String(b.phone).trim() : null,
          b.role != null ? String(b.role).trim() : null,
          b.salary_type === 'daily' ? 'daily' : 'monthly',
          Number(b.salary_amount) || 0,
          Number(b.working_hours_per_day) > 0 ? Number(b.working_hours_per_day) : 8,
          Number(b.overtime_rate_per_hour) || 0,
          annualLimit,
          Number(b.monthly_bonus) || 0,
          Number(b.monthly_deduction) || 0,
          Number(b.extra_overtime_hours_per_day) || 0,
          Number(b.monthly_tax) || 0,
          Number(b.monthly_insurance) || 0,
          Number(b.annual_raise_percent) || 0,
          Number(b.annual_raise_amount) || 0,
          punchCode,
          b.hire_date ? String(b.hire_date).slice(0, 10) : null,
          b.status === 'inactive' ? 'inactive' : 'active',
        ]
      );
      res.status(201).json({ id: (r as any).insertId });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Create employee failed' });
    }
  });

  app.put('/api/hr/employees/:id', authenticateToken, requireHrRole(...HR_STAFF_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const b = req.body || {};
      const punchRawU = b.biometric_punch_code != null ? String(b.biometric_punch_code).trim() : '';
      const punchCodeU = punchRawU === '' ? null : punchRawU.slice(0, 64);
      const annualLimitU = b.annual_leave_limit != null ? (Number(b.annual_leave_limit) > 0 ? Number(b.annual_leave_limit) : 21) : undefined;
      const updateFields = [
        'name=?', 'phone=?', 'role=?', 'salary_type=?', 'salary_amount=?', 'working_hours_per_day=?',
        'overtime_rate_per_hour=?', 'monthly_bonus=?', 'monthly_deduction=?', 'extra_overtime_hours_per_day=?',
        'monthly_tax=?', 'monthly_insurance=?', 'annual_raise_percent=?', 'annual_raise_amount=?',
        'biometric_punch_code=?', 'hire_date=?', 'status=?',
      ];
      const updateVals: any[] = [
        String(b.name || '').trim(),
        b.phone != null ? String(b.phone).trim() : null,
        b.role != null ? String(b.role).trim() : null,
        b.salary_type === 'daily' ? 'daily' : 'monthly',
        Number(b.salary_amount) || 0,
        Number(b.working_hours_per_day) > 0 ? Number(b.working_hours_per_day) : 8,
        Number(b.overtime_rate_per_hour) || 0,
        Number(b.monthly_bonus) || 0,
        Number(b.monthly_deduction) || 0,
        Number(b.extra_overtime_hours_per_day) || 0,
        Number(b.monthly_tax) || 0,
        Number(b.monthly_insurance) || 0,
        Number(b.annual_raise_percent) || 0,
        Number(b.annual_raise_amount) || 0,
        punchCodeU,
        b.hire_date ? String(b.hire_date).slice(0, 10) : null,
        b.status === 'inactive' ? 'inactive' : 'active',
      ];
      if (annualLimitU !== undefined) {
        updateFields.push('annual_leave_limit=?');
        updateVals.push(annualLimitU);
      }
      updateVals.push(id, shopId);
      const [result] = await pool.execute(
        `UPDATE hr_employees SET ${updateFields.join(', ')} WHERE id = ? AND shop_id = ?`,
        updateVals
      );
      if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Update employee failed' });
    }
  });

  app.delete('/api/hr/employees/:id', authenticateToken, requireHrRole(...HR_STAFF_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const id = Number(req.params.id);
      const [result] = await pool.execute('DELETE FROM hr_employees WHERE id = ? AND shop_id = ?', [id, shopId]);
      if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Delete employee failed' });
    }
  });

  // ---------- Attendance ----------
  app.get('/api/hr/attendance', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const from = String(req.query.from || '').slice(0, 10);
      const to = String(req.query.to || '').slice(0, 10);
      let employeeFilter = '';
      const params: any[] = [shopId];
      if (isEmployeeSelfRole(req.user.role)) {
        const eid = await getLinkedEmployeeId(req.user.id, shopId);
        if (!eid) return res.json([]);
        employeeFilter = ' AND a.employee_id = ?';
        params.push(eid);
      }
      let sql = `SELECT a.id, a.shop_id, a.employee_id,
          DATE_FORMAT(a.date, '%Y-%m-%d') AS date_display,
          a.date,
          a.check_in, a.check_out, a.total_hours, a.overtime_hours, a.status, a.source,
          a.leave_type,
          a.created_at, a.updated_at,
          e.name AS employee_name, e.phone AS employee_phone, e.role AS employee_role,
          e.salary_type AS employee_salary_type, e.salary_amount AS employee_salary_amount,
          e.working_hours_per_day AS employee_working_hours_per_day,
          e.overtime_rate_per_hour AS employee_overtime_rate_per_hour,
          e.monthly_bonus AS employee_monthly_bonus,
          e.monthly_deduction AS employee_monthly_deduction,
          e.extra_overtime_hours_per_day AS employee_extra_overtime_hours_per_day,
          DATE_FORMAT(e.hire_date, '%Y-%m-%d') AS employee_hire_date_display,
          e.created_at AS employee_created_at,
          (COALESCE(a.overtime_hours,0) + COALESCE(e.extra_overtime_hours_per_day,0)) AS overtime_hours_effective
        FROM hr_attendance a
        JOIN hr_employees e ON e.id = a.employee_id AND e.shop_id = a.shop_id
        WHERE a.shop_id = ?${employeeFilter}`;
      if (from && to) {
        sql += ' AND a.date BETWEEN ? AND ?';
        params.push(from, to);
      }
      sql += ' ORDER BY a.date DESC, e.name ASC LIMIT 2000';
      const [rows] = await pool.execute(sql, params);
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'List attendance failed' });
    }
  });

  app.post('/api/hr/attendance/check', authenticateToken, requireHrRole(...HR_PUNCH_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const { employee_id, date, action } = req.body || {};
      const eid = Number(employee_id);
      if (!eid) return res.status(400).json({ error: 'employee_id required' });
      const [emps] = await pool.execute('SELECT id, working_hours_per_day FROM hr_employees WHERE id = ? AND shop_id = ?', [
        eid,
        shopId,
      ]);
      if (!(emps as any[]).length) return res.status(404).json({ error: 'Employee not found' });
      const wh = Number((emps as any[])[0].working_hours_per_day) || 8;
      const d = date ? String(date).slice(0, 10) : new Date().toISOString().slice(0, 10);
      const now = new Date();
      const [rows] = await pool.execute(
        'SELECT * FROM hr_attendance WHERE shop_id = ? AND employee_id = ? AND date = ?',
        [shopId, eid, d]
      );
      let row = (rows as any[])[0];
      if (!row) {
        await pool.execute(
          `INSERT INTO hr_attendance (shop_id, employee_id, date, check_in, status, source) VALUES (?, ?, ?, ?, 'present', 'manual')`,
          [shopId, eid, d, now]
        );
        return res.json({ ok: true, phase: 'check_in' });
      }
      if (action === 'check_in' || !row.check_in) {
        await pool.execute(
          'UPDATE hr_attendance SET check_in = ?, status = ?, source = ? WHERE id = ? AND shop_id = ?',
          [now, 'present', 'manual', row.id, shopId]
        );
        return res.json({ ok: true, phase: 'check_in' });
      }
      if (!row.check_out) {
        const checkIn = new Date(row.check_in);
        const total = hoursBetween(checkIn, now);
        const ot = total > wh ? total - wh : 0;
        await pool.execute(
          'UPDATE hr_attendance SET check_out = ?, total_hours = ?, overtime_hours = ? WHERE id = ? AND shop_id = ?',
          [now, total, ot, row.id, shopId]
        );
        return res.json({ ok: true, phase: 'check_out', total_hours: total, overtime_hours: ot });
      }
      // both set — update check_out and recompute
      const checkIn = new Date(row.check_in);
      const total = hoursBetween(checkIn, now);
      const ot = total > wh ? total - wh : 0;
      await pool.execute(
        'UPDATE hr_attendance SET check_out = ?, total_hours = ?, overtime_hours = ? WHERE id = ? AND shop_id = ?',
        [now, total, ot, row.id, shopId]
      );
      return res.json({ ok: true, phase: 'check_out', total_hours: total, overtime_hours: ot });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Attendance check failed' });
    }
  });

  // ---------- Device punch (no JWT; device secret) ----------
  app.post('/api/hr/device-log', async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const b = req.body || {};
      const rawKey = b.employee_id ?? b.punch_code ?? b.user_id ?? b.pin;
      const did = Number(b.device_id);
      const secret = String(b.api_secret || req.headers['x-device-secret'] || req.headers['x-hr-device-key'] || '').trim();
      if (rawKey === undefined || rawKey === null || String(rawKey).trim() === '' || !secret) {
        return res.status(400).json({
          error:
            'employee_id (or punch_code) and api_secret (or X-HR-Device-Key header) required. Use HR employee id or biometric_punch_code from employee card.',
        });
      }
      let dev: any;
      if (did > 0) {
        const [devs] = await pool.execute('SELECT * FROM hr_devices WHERE id = ? AND api_secret = ? LIMIT 1', [did, secret]);
        dev = (devs as any[])[0];
      } else {
        const [devs] = await pool.execute('SELECT * FROM hr_devices WHERE api_secret = ? LIMIT 1', [secret]);
        dev = (devs as any[])[0];
      }
      if (!dev) return res.status(403).json({ error: 'Invalid device' });
      const shopId = Number(dev.shop_id);
      const keyStr = String(rawKey).trim();
      const keyNum = Number(keyStr);
      let eid: number | null = null;
      if (Number.isFinite(keyNum) && keyNum > 0) {
        const [byId] = await pool.execute('SELECT id, working_hours_per_day, name FROM hr_employees WHERE id = ? AND shop_id = ?', [
          keyNum,
          shopId,
        ]);
        if ((byId as any[]).length) eid = keyNum;
      }
      if (eid == null && (await hasColumn('hr_employees', 'biometric_punch_code'))) {
        const [byCode] = await pool.execute(
          'SELECT id, working_hours_per_day, name FROM hr_employees WHERE shop_id = ? AND biometric_punch_code = ? AND biometric_punch_code IS NOT NULL AND biometric_punch_code <> "" LIMIT 1',
          [shopId, keyStr]
        );
        const row = (byCode as any[])[0];
        if (row) eid = Number(row.id);
      }
      if (eid == null) return res.status(404).json({ error: 'Employee not found for id or punch_code' });
      const [emps] = await pool.execute('SELECT id, working_hours_per_day, name FROM hr_employees WHERE id = ? AND shop_id = ?', [
        eid,
        shopId,
      ]);
      const empRow = (emps as any[])[0];
      if (!empRow) return res.status(404).json({ error: 'Employee not found' });
      const wh = Number(empRow.working_hours_per_day) || 8;
      const ts = b.timestamp ? new Date(String(b.timestamp)) : new Date();
      if (Number.isNaN(ts.getTime())) return res.status(400).json({ error: 'Invalid timestamp' });
      const d = b.date ? String(b.date).slice(0, 10) : formatYmdInTz(ts, HR_DEFAULT_TZ);
      const source = dev.type === 'face' ? 'face' : 'fingerprint';
      const [rows] = await pool.execute(
        'SELECT * FROM hr_attendance WHERE shop_id = ? AND employee_id = ? AND date = ?',
        [shopId, eid, d]
      );
      let row = (rows as any[])[0];
      if (!row) {
        await pool.execute(
          `INSERT INTO hr_attendance (shop_id, employee_id, date, check_in, status, source) VALUES (?, ?, ?, ?, 'present', ?)`,
          [shopId, eid, d, ts, source]
        );
        return res.json({
          ok: true,
          phase: 'check_in',
          employee_id: eid,
          employee_name: empRow.name,
          date: d,
        });
      }
      if (!row.check_in) {
        await pool.execute(
          'UPDATE hr_attendance SET check_in = ?, source = ? WHERE id = ? AND shop_id = ?',
          [ts, source, row.id, shopId]
        );
        return res.json({ ok: true, phase: 'check_in', employee_id: eid, employee_name: empRow.name, date: d });
      }
      if (!row.check_out) {
        const checkIn = new Date(row.check_in);
        const total = hoursBetween(checkIn, ts);
        const ot = total > wh ? total - wh : 0;
        await pool.execute(
          'UPDATE hr_attendance SET check_out = ?, total_hours = ?, overtime_hours = ?, source = ? WHERE id = ? AND shop_id = ?',
          [ts, total, ot, source, row.id, shopId]
        );
        return res.json({
          ok: true,
          phase: 'check_out',
          total_hours: total,
          overtime_hours: ot,
          employee_id: eid,
          employee_name: empRow.name,
          date: d,
        });
      }
      const checkIn = new Date(row.check_in);
      const total = hoursBetween(checkIn, ts);
      const ot = total > wh ? total - wh : 0;
      await pool.execute(
        'UPDATE hr_attendance SET check_out = ?, total_hours = ?, overtime_hours = ?, source = ? WHERE id = ? AND shop_id = ?',
        [ts, total, ot, source, row.id, shopId]
      );
      return res.json({
        ok: true,
        phase: 'check_out',
        total_hours: total,
        overtime_hours: ot,
        employee_id: eid,
        employee_name: empRow.name,
        date: d,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Device log failed' });
    }
  });

  // ---------- Devices ----------
  app.get('/api/hr/devices', authenticateToken, requireHrRole(...HR_STAFF_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const [rows] = await pool.execute(
        'SELECT id, shop_id, name, type, api_url, created_at, updated_at FROM hr_devices WHERE shop_id = ? ORDER BY id DESC',
        [shopId]
      );
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'List devices failed' });
    }
  });

  app.post('/api/hr/devices', authenticateToken, requireHrRole(...HR_STAFF_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const b = req.body || {};
      const api_secret = crypto.randomBytes(24).toString('hex');
      const [r] = await pool.execute(
        `INSERT INTO hr_devices (shop_id, name, type, api_url, api_secret) VALUES (?, ?, ?, ?, ?)`,
        [
          shopId,
          String(b.name || 'Device').trim(),
          b.type === 'face' ? 'face' : 'fingerprint',
          b.api_url != null ? String(b.api_url).trim().slice(0, 512) : null,
          api_secret,
        ]
      );
      res.status(201).json({ id: (r as any).insertId, api_secret });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Create device failed' });
    }
  });

  app.delete('/api/hr/devices/:id', authenticateToken, requireHrRole(...HR_STAFF_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const id = Number(req.params.id);
      const [result] = await pool.execute('DELETE FROM hr_devices WHERE id = ? AND shop_id = ?', [id, shopId]);
      if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Delete device failed' });
    }
  });

  // ---------- Leave entries ----------
  app.post('/api/hr/leave-entries', authenticateToken, requireHrRole(...HR_STAFF_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const b = req.body || {};
      const eid = Number(b.employee_id);
      if (!eid) return res.status(400).json({ error: 'employee_id required' });
      const [chk] = await pool.execute('SELECT id FROM hr_employees WHERE id = ? AND shop_id = ?', [eid, shopId]);
      if (!(chk as any[]).length) return res.status(404).json({ error: 'Employee not found' });
      const lt = String(b.leave_type || '').toLowerCase();
      const validTypes = ['annual', 'sick', 'emergency', 'maternity'];
      if (!validTypes.includes(lt)) return res.status(400).json({ error: 'leave_type must be annual|sick|emergency|maternity' });
      const startDate = String(b.start_date || '').slice(0, 10);
      const endDate = String(b.end_date || '').slice(0, 10);
      if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return res.status(400).json({ error: 'start_date and end_date required (YYYY-MM-DD)' });
      }
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) return res.status(400).json({ error: 'end_date must be >= start_date' });
      const leaveYear = b.leave_year != null ? Number(b.leave_year) : start.getFullYear();
      const days = Number(b.days) > 0 ? Number(b.days) : Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      const notes = b.notes != null ? String(b.notes).trim().slice(0, 4096) : null;
      const [r] = await pool.execute(
        `INSERT INTO hr_leave_entries (shop_id, employee_id, leave_type, start_date, end_date, days, leave_year, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [shopId, eid, lt, startDate, endDate, days, leaveYear, notes || null]
      );
      const hasLeaveType = await hasColumn('hr_attendance', 'leave_type');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const [ex] = await pool.execute(
          'SELECT id FROM hr_attendance WHERE shop_id = ? AND employee_id = ? AND date = ?',
          [shopId, eid, dateStr]
        );
        if ((ex as any[]).length) {
          if (hasLeaveType) {
            await pool.execute(
              'UPDATE hr_attendance SET status = ?, leave_type = ? WHERE shop_id = ? AND employee_id = ? AND date = ?',
              ['leave', lt, shopId, eid, dateStr]
            );
          } else {
            await pool.execute(
              'UPDATE hr_attendance SET status = ? WHERE shop_id = ? AND employee_id = ? AND date = ?',
              ['leave', shopId, eid, dateStr]
            );
          }
        } else {
          if (hasLeaveType) {
            await pool.execute(
              'INSERT INTO hr_attendance (shop_id, employee_id, date, status, leave_type, source) VALUES (?, ?, ?, ?, ?, ?)',
              [shopId, eid, dateStr, 'leave', lt, 'manual']
            );
          } else {
            await pool.execute(
              'INSERT INTO hr_attendance (shop_id, employee_id, date, status, source) VALUES (?, ?, ?, ?, ?)',
              [shopId, eid, dateStr, 'leave', 'manual']
            );
          }
        }
      }
      res.status(201).json({ id: (r as any).insertId });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Add leave entry failed' });
    }
  });

  app.get('/api/hr/leave-entries', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const employeeId = req.query.employee_id != null ? Number(req.query.employee_id) : null;
      const year = req.query.year != null ? Number(req.query.year) : null;
      let sql = `SELECT l.*, e.name AS employee_name
        FROM hr_leave_entries l
        JOIN hr_employees e ON e.id = l.employee_id AND e.shop_id = l.shop_id
        WHERE l.shop_id = ?`;
      const params: any[] = [shopId];
      if (employeeId && Number.isFinite(employeeId)) {
        sql += ' AND l.employee_id = ?';
        params.push(employeeId);
      }
      if (year && Number.isFinite(year)) {
        sql += ' AND l.leave_year = ?';
        params.push(year);
      }
      if (isEmployeeSelfRole(req.user.role)) {
        const eid = await getLinkedEmployeeId(req.user.id, shopId);
        if (!eid) return res.json([]);
        sql += ' AND l.employee_id = ?';
        params.push(eid);
      }
      sql += ' ORDER BY l.start_date DESC, l.id DESC LIMIT 500';
      const [rows] = await pool.execute(sql, params);
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'List leave entries failed' });
    }
  });

  app.get('/api/hr/leave-balance', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const employeeId = Number(req.query.employee_id);
      const year = Number(req.query.year) || new Date().getFullYear();
      if (!employeeId || !Number.isFinite(employeeId)) return res.status(400).json({ error: 'employee_id required' });
      if (isEmployeeSelfRole(req.user.role)) {
        const eid = await getLinkedEmployeeId(req.user.id, shopId);
        if (!eid || eid !== employeeId) return res.status(403).json({ error: 'Cannot view other employee balance' });
      }
      const [emps] = await pool.execute(
        'SELECT id, COALESCE(annual_leave_limit, 21) AS annual_leave_limit FROM hr_employees WHERE id = ? AND shop_id = ?',
        [employeeId, shopId]
      );
      if (!(emps as any[]).length) return res.status(404).json({ error: 'Employee not found' });
      const limit = Number((emps as any[])[0].annual_leave_limit) || 21;
      const [rows] = await pool.execute(
        `SELECT leave_type, SUM(days) AS total FROM hr_leave_entries
         WHERE shop_id = ? AND employee_id = ? AND leave_year = ? GROUP BY leave_type`,
        [shopId, employeeId, year]
      );
      const used: Record<string, number> = { annual: 0, sick: 0, emergency: 0, maternity: 0 };
      for (const r of rows as any[]) {
        used[r.leave_type] = Number(r.total) || 0;
      }
      const usedAnnual = used.annual || 0;
      const available = Math.max(0, limit - usedAnnual);
      const exceeded = usedAnnual - limit;
      res.json({
        limit,
        used_annual: usedAnnual,
        used_sick: used.sick || 0,
        used_emergency: used.emergency || 0,
        used_maternity: used.maternity || 0,
        available,
        exceeded: exceeded > 0 ? exceeded : 0,
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Leave balance failed' });
    }
  });

  // ---------- Payroll ----------
  app.post('/api/hr/payroll/calculate', authenticateToken, requireHrRole(...HR_PAYROLL_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const month = String(req.body?.month || req.query?.month || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month YYYY-MM required' });

      const [startDate, endDate] = [`${month}-01`, `${month}-31`];
      const [employees] = await pool.execute(
        "SELECT * FROM hr_employees WHERE shop_id = ? AND status = 'active'",
        [shopId]
      );
      const emps = employees as any[];
      let upserted = 0;
      for (const emp of emps) {
        const [paidRows] = await pool.execute(
          'SELECT paid FROM hr_payroll WHERE shop_id = ? AND employee_id = ? AND month = ?',
          [shopId, emp.id, month]
        );
        if (Number((paidRows as any[])[0]?.paid) === 1) {
          upserted++;
          continue;
        }
        const [[attRows], [leaveRows]] = await Promise.all([
          pool.execute(
            `SELECT COUNT(DISTINCT a.date) AS c,
              COALESCE(SUM(COALESCE(a.overtime_hours,0) + COALESCE(e.extra_overtime_hours_per_day,0)),0) AS ot
             FROM hr_attendance a
             JOIN hr_employees e ON e.id = a.employee_id AND e.shop_id = a.shop_id
             WHERE a.shop_id = ? AND a.employee_id = ? AND a.date BETWEEN ? AND ? AND a.status = 'present'`,
            [shopId, emp.id, startDate, endDate]
          ),
          pool.execute(
            `SELECT COUNT(DISTINCT a.date) AS c FROM hr_attendance a
             WHERE a.shop_id = ? AND a.employee_id = ? AND a.date BETWEEN ? AND ? AND a.status = 'leave'`,
            [shopId, emp.id, startDate, endDate]
          ),
        ]);
        const presentDays = Number((attRows as any[])[0]?.c ?? 0);
        const leaveDays = Number((leaveRows as any[])[0]?.c ?? 0);
        const attendanceDays = presentDays + leaveDays;
        const overtimeHours = Number((attRows as any[])[0]?.ot ?? 0);
        const absentDays = Math.max(0, 30 - attendanceDays);
        const salaryAmount = adjustedEmployeeBase(emp);
        let dailySalary: number;
        if (emp.salary_type === 'daily') {
          dailySalary = salaryAmount;
        } else {
          dailySalary = salaryAmount / 30;
        }
        const salaryAfterAbsence = dailySalary * attendanceDays;
        const otRate = Number(emp.overtime_rate_per_hour) || 0;
        const overtimeAmount = overtimeHours * otRate;
        const deductions = Number(emp.monthly_deduction) || 0;
        const bonuses = Number(emp.monthly_bonus) || 0;
        const tax = Number(emp.monthly_tax) || 0;
        const insurance = Number(emp.monthly_insurance) || 0;
        const grossSalary = salaryAfterAbsence + overtimeAmount + bonuses - deductions;
        const totalSalary = grossSalary - tax - insurance;
        await pool.execute(
          `INSERT INTO hr_payroll (shop_id, employee_id, month, base_salary, attendance_days, absent_days, leave_days, overtime_hours, overtime_amount, deductions, bonuses, gross_salary, tax_amount, insurance_amount, total_salary, paid)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
           ON DUPLICATE KEY UPDATE
             base_salary = VALUES(base_salary),
             attendance_days = VALUES(attendance_days),
             absent_days = VALUES(absent_days),
             leave_days = VALUES(leave_days),
             overtime_hours = VALUES(overtime_hours),
             overtime_amount = VALUES(overtime_amount),
             deductions = VALUES(deductions),
             bonuses = VALUES(bonuses),
             gross_salary = VALUES(gross_salary),
             tax_amount = VALUES(tax_amount),
             insurance_amount = VALUES(insurance_amount),
             total_salary = VALUES(total_salary)`,
          [
            shopId,
            emp.id,
            month,
            salaryAmount,
            attendanceDays,
            absentDays,
            leaveDays,
            overtimeHours,
            overtimeAmount,
            deductions,
            bonuses,
            grossSalary,
            tax,
            insurance,
            totalSalary,
          ]
        );
        upserted++;
      }
      res.json({ ok: true, month, employees: upserted });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Payroll calculate failed' });
    }
  });

  app.get('/api/hr/payroll', authenticateToken, requireHrRole(...HR_PAYROLL_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const month = String(req.query.month || '').slice(0, 7);
      const leaveYear = month ? parseInt(month.slice(0, 4), 10) : new Date().getFullYear();
      let sql =
        `SELECT p.*, e.name AS employee_name,
          COALESCE(e.annual_leave_limit, 21) AS leave_balance_limit,
          COALESCE((SELECT SUM(l.days) FROM hr_leave_entries l WHERE l.shop_id = p.shop_id AND l.employee_id = p.employee_id AND l.leave_year = ? AND l.leave_type = 'annual'), 0) AS leave_balance_used,
          GREATEST(0, COALESCE(e.annual_leave_limit, 21) - COALESCE((SELECT SUM(l.days) FROM hr_leave_entries l WHERE l.shop_id = p.shop_id AND l.employee_id = p.employee_id AND l.leave_year = ? AND l.leave_type = 'annual'), 0)) AS leave_balance_available
         FROM hr_payroll p JOIN hr_employees e ON e.id = p.employee_id AND e.shop_id = p.shop_id WHERE p.shop_id = ?`;
      const params: any[] = [leaveYear, leaveYear, shopId];
      if (/^\d{4}-\d{2}$/.test(month)) {
        sql += ' AND p.month = ?';
        params.push(month);
      }
      sql += ' ORDER BY p.employee_id ASC';
      const [rows] = await pool.execute(sql, params);
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'List payroll failed' });
    }
  });

  app.get('/api/hr/payroll/:id/payslip', authenticateToken, requireHrRole(...HR_PAYROLL_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const [rows] = await pool.execute(
        `SELECT p.*, e.name AS employee_name, e.phone AS employee_phone, e.role AS job_role,
          e.salary_type AS employee_salary_type, e.salary_amount AS contract_salary_amount,
          e.annual_raise_percent, e.annual_raise_amount,
          COALESCE(e.annual_leave_limit, 21) AS annual_leave_limit
         FROM hr_payroll p
         JOIN hr_employees e ON e.id = p.employee_id AND e.shop_id = p.shop_id
         WHERE p.id = ? AND p.shop_id = ? LIMIT 1`,
        [id, shopId]
      );
      const row = (rows as any[])[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      const leaveYear = row.month ? parseInt(String(row.month).slice(0, 4), 10) : new Date().getFullYear();
      const [usedRows] = await pool.execute(
        `SELECT COALESCE(SUM(days), 0) AS used FROM hr_leave_entries
         WHERE shop_id = ? AND employee_id = ? AND leave_year = ? AND leave_type = 'annual'`,
        [shopId, row.employee_id, leaveYear]
      );
      const usedAnnual = Number((usedRows as any[])[0]?.used ?? 0);
      const limit = Number(row.annual_leave_limit) || 21;
      const available = Math.max(0, limit - usedAnnual);
      const payload = { ...row, leave_balance_available: available, leave_balance_used: usedAnnual, leave_balance_limit: limit };
      res.json(payload);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Payslip failed' });
    }
  });

  app.patch('/api/hr/payroll/:id', authenticateToken, requireHrRole(...HR_PAYROLL_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const id = Number(req.params.id);
      const { bonuses, deductions } = req.body || {};
      const [pr] = await pool.execute('SELECT * FROM hr_payroll WHERE id = ? AND shop_id = ?', [id, shopId]);
      const row = (pr as any[])[0];
      if (!row) return res.status(404).json({ error: 'Not found' });
      if (Number(row.paid) === 1) return res.status(400).json({ error: 'Already paid' });
      const b = bonuses != null ? Number(bonuses) : Number(row.bonuses) || 0;
      const d = deductions != null ? Number(deductions) : Number(row.deductions) || 0;
      const [emps] = await pool.execute('SELECT * FROM hr_employees WHERE id = ? AND shop_id = ?', [row.employee_id, shopId]);
      const emp = (emps as any[])[0];
      const adjBase = adjustedEmployeeBase(emp || {});
      const daily = emp?.salary_type === 'daily' ? adjBase : adjBase / 30;
      const salaryAfterAbsence = daily * Number(row.attendance_days || 0);
      const grossSalary = salaryAfterAbsence + Number(row.overtime_amount || 0) + b - d;
      const tax = Number(emp?.monthly_tax) || 0;
      const insurance = Number(emp?.monthly_insurance) || 0;
      const totalSalary = grossSalary - tax - insurance;
      await pool.execute(
        'UPDATE hr_payroll SET bonuses = ?, deductions = ?, base_salary = ?, gross_salary = ?, tax_amount = ?, insurance_amount = ?, total_salary = ? WHERE id = ? AND shop_id = ?',
        [b, d, adjBase, grossSalary, tax, insurance, totalSalary, id, shopId]
      );
      res.json({ ok: true, total_salary: totalSalary });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Update payroll failed' });
    }
  });

  app.post('/api/hr/payroll/pay', authenticateToken, requireHrRole(...HR_PAYROLL_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      await ensureAccountingTables();
      await ensureJournalColumns();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const month = String(req.body?.month || '').slice(0, 7);
      const paymentAccount = String(req.body?.payment_account || 'cash').toLowerCase() === 'bank' ? '1100' : '1000';
      const ids = Array.isArray(req.body?.payroll_ids) ? req.body.payroll_ids.map(Number).filter((n: number) => n > 0) : null;

      let sql =
        'SELECT * FROM hr_payroll WHERE shop_id = ? AND paid = 0 AND total_salary > 0';
      const params: any[] = [shopId];
      if (/^\d{4}-\d{2}$/.test(month)) {
        sql += ' AND month = ?';
        params.push(month);
      }
      if (ids?.length) {
        sql += ` AND id IN (${ids.map(() => '?').join(',')})`;
        params.push(...ids);
      }
      const [rows] = await pool.execute(sql, params);
      const list = rows as any[];
      if (!list.length) return res.json({ ok: true, paid: 0, message: 'Nothing to pay' });

      const dateCol = (await hasColumn('journal_entries', 'date')) ? 'date' : 'entry_date';
      const hasSource = await hasColumn('journal_entries', 'source_type');
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const byCode = await ensureSalaryAccount(conn, shopId);
        const expenseId = byCode.get('6100');
        const creditId = byCode.get(paymentAccount);
        if (!expenseId || !creditId) throw new Error('Missing accounts 6100 / ' + paymentAccount);

        let paid = 0;
        for (const row of list) {
          const amount = Number(row.total_salary) || 0;
          if (amount <= 0) continue;
          const [ins] = hasSource
            ? await conn.execute(
                `INSERT INTO journal_entries (shop_id, ${dateCol}, reference, description, source_type, source_id) VALUES (?, CURDATE(), ?, ?, ?, ?)`,
                [
                  shopId,
                  `HR-PAY-${row.month}-${row.id}`,
                  `Payroll employee #${row.employee_id} ${row.month}`,
                  'hr_payroll',
                  row.id,
                ]
              )
            : await conn.execute(
                `INSERT INTO journal_entries (shop_id, ${dateCol}, reference, description) VALUES (?, CURDATE(), ?, ?)`,
                [shopId, `HR-PAY-${row.month}-${row.id}`, `Payroll employee #${row.employee_id} ${row.month}`]
              );
          const entryId = (ins as any).insertId;
          await conn.execute(
            'INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)',
            [entryId, expenseId, amount, 0]
          );
          await conn.execute(
            'INSERT INTO journal_lines (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, ?)',
            [entryId, creditId, 0, amount]
          );
          await conn.execute(
            'UPDATE hr_payroll SET paid = 1, paid_at = NOW(), journal_entry_id = ? WHERE id = ? AND shop_id = ?',
            [entryId, row.id, shopId]
          );
          paid++;
        }
        await conn.commit();
        res.json({ ok: true, paid });
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Payroll pay failed' });
    }
  });

  // ---------- Overtime aggregate (same data as attendance; filtered) ----------
  app.get('/api/hr/overtime', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const from = String(req.query.from || '').slice(0, 10);
      const to = String(req.query.to || '').slice(0, 10);
      let sql = `SELECT a.employee_id, e.name AS employee_name,
          SUM(COALESCE(a.overtime_hours,0) + COALESCE(e.extra_overtime_hours_per_day,0)) AS overtime_hours
        FROM hr_attendance a JOIN hr_employees e ON e.id = a.employee_id AND e.shop_id = a.shop_id
        WHERE a.shop_id = ?`;
      const params: any[] = [shopId];
      if (isEmployeeSelfRole(req.user.role)) {
        const eid = await getLinkedEmployeeId(req.user.id, shopId);
        if (!eid) return res.json([]);
        sql += ' AND a.employee_id = ?';
        params.push(eid);
      }
      if (from && to) {
        sql += ' AND a.date BETWEEN ? AND ?';
        params.push(from, to);
      }
      sql +=
        ' GROUP BY a.employee_id, e.name HAVING SUM(COALESCE(a.overtime_hours,0) + COALESCE(e.extra_overtime_hours_per_day,0)) > 0 ORDER BY overtime_hours DESC';
      const [rows] = await pool.execute(sql, params);
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Overtime report failed' });
    }
  });

  // ---------- Employee sessions ----------
  app.get('/api/hr/employee-sessions', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const from = String(req.query.from || '').slice(0, 10);
      const to = String(req.query.to || '').slice(0, 10);
      let sql =
        'SELECT s.*, e.name AS employee_name FROM hr_employee_sessions s JOIN hr_employees e ON e.id = s.employee_id WHERE s.shop_id = ?';
      const params: any[] = [shopId];
      if (isEmployeeSelfRole(req.user.role)) {
        const eid = await getLinkedEmployeeId(req.user.id, shopId);
        if (!eid) return res.json([]);
        sql += ' AND s.employee_id = ?';
        params.push(eid);
      }
      if (from && to) {
        sql += ' AND DATE(s.login_time) BETWEEN ? AND ?';
        params.push(from, to);
      }
      sql += ' ORDER BY s.login_time DESC LIMIT 2000';
      const [rows] = await pool.execute(sql, params);
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'List sessions failed' });
    }
  });

  app.post('/api/hr/employee-sessions/start', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      let employeeId: number | null = null;
      if (isEmployeeSelfRole(req.user.role)) {
        employeeId = await getLinkedEmployeeId(req.user.id, shopId);
        if (!employeeId) return res.status(400).json({ error: 'No linked employee' });
      } else {
        employeeId = Number(req.body?.employee_id) || null;
        if (!employeeId) return res.status(400).json({ error: 'employee_id required' });
        const [chk] = await pool.execute('SELECT id FROM hr_employees WHERE id = ? AND shop_id = ?', [employeeId, shopId]);
        if (!(chk as any[]).length) return res.status(404).json({ error: 'Employee not found' });
      }
      const uid = req.user.id;
      await pool.execute(
        `INSERT INTO hr_employee_sessions (shop_id, employee_id, user_id, login_time) VALUES (?, ?, ?, NOW())`,
        [shopId, employeeId, uid]
      );
      const [lr] = await pool.execute('SELECT LAST_INSERT_ID() AS id');
      res.status(201).json({ ok: true, id: Number((lr as any[])[0]?.id) });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Start session failed' });
    }
  });

  app.post('/api/hr/employee-sessions/end', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const userId = req.user.id;
      let employeeId: number | null = null;
      if (isEmployeeSelfRole(req.user.role)) {
        employeeId = await getLinkedEmployeeId(userId, shopId);
        if (!employeeId) return res.status(400).json({ error: 'No linked employee' });
      } else {
        employeeId = Number(req.body?.employee_id) || null;
        if (!employeeId) return res.status(400).json({ error: 'employee_id required' });
        const [chk] = await pool.execute('SELECT id FROM hr_employees WHERE id = ? AND shop_id = ?', [employeeId, shopId]);
        if (!(chk as any[]).length) return res.status(404).json({ error: 'Employee not found' });
      }
      const [open] = await pool.execute(
        `SELECT id FROM hr_employee_sessions WHERE shop_id = ? AND employee_id = ? AND logout_time IS NULL ORDER BY id DESC LIMIT 1`,
        [shopId, employeeId]
      );
      const sid = Number((open as any[])[0]?.id);
      if (!sid) return res.json({ ok: true, closed: 0 });
      await pool.execute('UPDATE hr_employee_sessions SET logout_time = NOW() WHERE id = ? AND shop_id = ?', [sid, shopId]);
      res.json({ ok: true, closed: sid });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'End session failed' });
    }
  });

  // ---------- Reports ----------
  app.get('/api/hr/reports/attendance', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const from = String(req.query.from || '').slice(0, 10);
      const to = String(req.query.to || '').slice(0, 10);
      if (!from || !to) return res.status(400).json({ error: 'from and to required' });
      let sql = `SELECT a.id, a.shop_id, a.employee_id,
          DATE_FORMAT(a.date, '%Y-%m-%d') AS date_display,
          a.date, a.check_in, a.check_out, a.total_hours, a.overtime_hours, a.status, a.source,
          e.name AS employee_name,
          (COALESCE(a.overtime_hours,0) + COALESCE(e.extra_overtime_hours_per_day,0)) AS overtime_hours_effective
        FROM hr_attendance a
        JOIN hr_employees e ON e.id = a.employee_id WHERE a.shop_id = ? AND a.date BETWEEN ? AND ?`;
      const params: any[] = [shopId, from, to];
      if (isEmployeeSelfRole(req.user.role)) {
        const eid = await getLinkedEmployeeId(req.user.id, shopId);
        if (!eid) return res.json([]);
        sql += ' AND a.employee_id = ?';
        params.push(eid);
      }
      sql += ' ORDER BY a.date, e.name';
      const [rows] = await pool.execute(sql, params);
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Report failed' });
    }
  });

  app.get('/api/hr/reports/payroll', authenticateToken, requireHrRole(...HR_PAYROLL_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const month = String(req.query.month || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month required' });
      const [rows] = await pool.execute(
        `SELECT p.*, e.name AS employee_name FROM hr_payroll p
         JOIN hr_employees e ON e.id = p.employee_id WHERE p.shop_id = ? AND p.month = ? ORDER BY p.employee_id`,
        [shopId, month]
      );
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Report failed' });
    }
  });

  app.get('/api/hr/reports/absence', authenticateToken, requireHrRole(...HR_STAFF_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const month = String(req.query.month || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: 'month required' });
      const start = `${month}-01`;
      const end = `${month}-31`;
      const [rows] = await pool.execute(
        `SELECT e.id AS employee_id, e.name,
          (SELECT COUNT(DISTINCT a.date) FROM hr_attendance a
            WHERE a.shop_id = e.shop_id AND a.employee_id = e.id AND a.date BETWEEN ? AND ? AND a.status = 'present') AS present_days,
          GREATEST(0, 30 - (SELECT COUNT(DISTINCT a.date) FROM hr_attendance a
            WHERE a.shop_id = e.shop_id AND a.employee_id = e.id AND a.date BETWEEN ? AND ? AND a.status = 'present')) AS absent_days
         FROM hr_employees e WHERE e.shop_id = ? AND e.status = 'active' ORDER BY e.name`,
        [start, end, start, end, shopId]
      );
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Report failed' });
    }
  });

  app.get('/api/hr/reports/overtime', authenticateToken, requireHrRole(...HR_OPS_ROLES), async (req: any, res: Response) => {
    try {
      await ensureHrTablesOnce();
      const shopId = getShopIdOrFail(req, res);
      if (shopId === null) return;
      const from = String(req.query.from || '').slice(0, 10);
      const to = String(req.query.to || '').slice(0, 10);
      let sql = `SELECT a.employee_id, e.name AS employee_name,
          SUM(COALESCE(a.overtime_hours,0) + COALESCE(e.extra_overtime_hours_per_day,0)) AS overtime_hours
        FROM hr_attendance a JOIN hr_employees e ON e.id = a.employee_id AND e.shop_id = a.shop_id
        WHERE a.shop_id = ?`;
      const params: any[] = [shopId];
      if (isEmployeeSelfRole(req.user.role)) {
        const eid = await getLinkedEmployeeId(req.user.id, shopId);
        if (!eid) return res.json([]);
        sql += ' AND a.employee_id = ?';
        params.push(eid);
      }
      if (from && to) {
        sql += ' AND a.date BETWEEN ? AND ?';
        params.push(from, to);
      }
      sql +=
        ' GROUP BY a.employee_id, e.name HAVING SUM(COALESCE(a.overtime_hours,0) + COALESCE(e.extra_overtime_hours_per_day,0)) > 0 ORDER BY overtime_hours DESC';
      const [rows] = await pool.execute(sql, params);
      res.json(rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Report failed' });
    }
  });
}
