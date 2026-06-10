/**
 * Branch inventory API: PUT /api/admin/branch-inventory/product/:productId
 * File: backend/routes/admin/branchInventory.ts
 * Mount: app.use("/api/admin/branch-inventory", branchInventoryRoutes)
 *
 * Request body: { "branches": [ { "branch_id": 1, "quantity": 50 }, { "branch_id": 17, "quantity": 50 } ] }
 * or legacy: { "branches": [1, 17] } (quantity 0).
 * Table: branch_inventory (id, product_id, branch_id, shop_id, quantity, created_at)
 * Logic: DELETE all for product; INSERT each branch with real quantity (ON DUPLICATE KEY UPDATE quantity).
 * Response: { success: true, message: "Branches linked successfully" }
 */
import { Router, Response } from 'express';
import { pool } from '../../db';

export interface BranchInventoryDeps {
  getShopIdOrFail: (req: any, res: Response) => number | null;
  authenticateToken: (req: any, res: Response, next: () => void) => void;
  ensureBranchInventoryTable: () => Promise<void>;
  hasColumn: (table: string, col: string) => Promise<boolean>;
}

export function createBranchInventoryRoutes(deps: BranchInventoryDeps): Router {
  const router = Router();

  router.put('/product/:productId', deps.authenticateToken, async (req: any, res: Response) => {
    try {
      // Allow ALL authenticated users with a shop to update branch inventory (clients + admin).
      const shopId = deps.getShopIdOrFail(req, res);
      if (shopId === null) return;
      const productId = parseInt(String(req.params.productId ?? req.params.id ?? ''), 10);
      if (!productId || Number.isNaN(productId)) {
        return res.status(400).json({ success: false, message: 'Invalid product id' });
      }
      const raw = req.body?.branches;
      console.log('Saving branches:', raw);
      if (!Array.isArray(raw) || raw.length === 0) {
        return res.status(400).json({ success: false, message: 'Request body must include branches array with { branch_id, quantity }' });
      }
      const branches: { branch_id: number; quantity: number }[] = [];
      for (const b of raw as any[]) {
        if (typeof b !== 'object' || (b.branch_id == null && b.id == null)) continue;
        const branch_id = Number(b.branch_id ?? b.id);
        if (Number.isNaN(branch_id) || branch_id <= 0) continue;
        const quantity = parseFloat(b.quantity);
        if (Number.isNaN(quantity) || quantity < 0) {
          return res.status(400).json({ success: false, message: 'Invalid quantity for branch ' + branch_id });
        }
        branches.push({ branch_id, quantity });
      }
      if (branches.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid branches with branch_id and quantity' });
      }
      await deps.ensureBranchInventoryTable();
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        for (const { branch_id, quantity } of branches) {
          await conn.execute(
            `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
            [shopId, branch_id, productId, quantity]
          );
        }
        const branchIds = branches.map((b) => b.branch_id);
        if (branchIds.length > 0) {
          const placeholders = branchIds.map(() => '?').join(',');
          await conn.execute(
            `DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ? AND branch_id NOT IN (${placeholders})`,
            [shopId, productId, ...branchIds]
          );
        } else {
          await conn.execute('DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ?', [shopId, productId]);
        }
        await conn.commit();
        const [verifyRows] = await pool.execute(
          'SELECT branch_id, product_id, quantity FROM branch_inventory WHERE product_id = ?',
          [productId]
        );
        console.log('Saved rows:', branches.length, 'branch_inventory for product', productId, '| Database result:', verifyRows);
        // Always sync product stock from sum of branch_inventory for all accounts.
        await pool.execute(
          'UPDATE products p SET p.stock_quantity = (SELECT IFNULL(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id) WHERE p.id = ? AND p.shop_id = ?',
          [productId, shopId]
        ).catch((err: any) => console.warn('[branch-inventory] global stock sync failed:', err?.message));
        res.status(200).json({ success: true, message: 'Branches linked successfully' });
      } catch (e: any) {
        await conn.rollback().catch(() => {});
        throw e;
      } finally {
        conn.release();
      }
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  router.get('/product/:productId', deps.authenticateToken, async (req: any, res: Response) => {
    try {
      const shopId = deps.getShopIdOrFail(req, res);
      if (shopId === null) return;
      const productId = parseInt(String(req.params.productId ?? req.params.id ?? ''), 10);
      if (!productId || Number.isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product id' });
      }
      await deps.ensureBranchInventoryTable();
      const [rows] = await pool.execute(
        `SELECT b.id AS branch_id, b.name AS branch_name, b.name_ar AS branch_name_ar, b.name_en AS branch_name_en,
                COALESCE(bi.quantity, 0) AS quantity
         FROM branches b
         LEFT JOIN branch_inventory bi
           ON bi.branch_id = b.id AND bi.shop_id = b.shop_id AND bi.product_id = ?
         WHERE b.shop_id = ?
         ORDER BY b.id`,
        [productId, shopId]
      );
      const branch_ids = (rows as any[]).map((r) => Number(r.branch_id));
      const branches = (rows as any[]).map((r) => ({
        branch_id: Number(r.branch_id),
        branch_name: r.branch_name || '',
        branch_name_ar: r.branch_name_ar || r.branch_name || '',
        branch_name_en: r.branch_name_en || r.branch_name || '',
        quantity: Number(r.quantity) || 0,
      }));
      res.json({ productId, branch_ids, branches });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
