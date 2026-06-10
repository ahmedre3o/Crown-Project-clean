import { pool } from '../db';

async function tableExists(name: string): Promise<boolean> {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as c FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [name]
    );
    return Number((rows as any[])[0]?.c ?? 0) > 0;
  } catch {
    return false;
  }
}

async function columnExists(table: string, column: string): Promise<boolean> {
  try {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
      [table, column]
    );
    return Number((rows as any[])[0]?.c ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Called after successful login — opens HR session row when user is linked to hr_employees. */
export async function recordHrEmployeeLoginOnAuth(userRow: {
  id: number;
  shop_id?: number | null;
}): Promise<void> {
  try {
    if (!(await tableExists('hr_employee_sessions'))) return;
    if (!(await columnExists('users', 'hr_employee_id'))) return;
    const shopId = Number(userRow.shop_id);
    if (!shopId) return;
    const [rows] = await pool.execute(
      'SELECT hr_employee_id FROM users WHERE id = ? AND shop_id = ? LIMIT 1',
      [userRow.id, shopId]
    );
    const eid = Number((rows as any[])[0]?.hr_employee_id);
    if (!Number.isFinite(eid) || eid <= 0) return;
    const [chk] = await pool.execute('SELECT id FROM hr_employees WHERE id = ? AND shop_id = ?', [eid, shopId]);
    if (!(chk as any[]).length) return;
    await pool.execute(
      `INSERT INTO hr_employee_sessions (shop_id, employee_id, user_id, login_time) VALUES (?, ?, ?, NOW())`,
      [shopId, eid, userRow.id]
    );
  } catch (e: any) {
    console.warn('[HR] recordHrEmployeeLoginOnAuth:', e?.message || e);
  }
}
