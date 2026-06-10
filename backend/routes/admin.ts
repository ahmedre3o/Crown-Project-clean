/**
 * Admin routes: branch-inventory product assignment (Edit Product form Save).
 * Mounted at /api/admin so PUT /api/admin/branch-inventory/product/:id is the canonical endpoint.
 */
import { Router, Response } from 'express';
import { pool } from '../db';
import { requireShopCapability } from '../rbacMiddleware';

type GetShopIdOrFail = (req: any, res: Response) => number | null;
type AuthMiddleware = (req: any, res: Response, next: () => void) => void;
type EnsureTable = () => Promise<void>;
type HasColumn = (table: string, column: string) => Promise<boolean>;

export interface AdminRouteDeps {
  getShopIdOrFail: GetShopIdOrFail;
  authenticateToken: AuthMiddleware;
  ensureBranchInventoryTable: EnsureTable;
  hasColumn: HasColumn;
  getStockMovements?: (req: any, res: Response) => Promise<void>;
}

/**
 * Normalize body to array of { branch_id, quantity }.
 * Accepts:
 * - body.branchAssignments: { branch_id, quantity? }[]
 * - body.branches: { branch_id, quantity }[] (from UI) or number[] (legacy ids only → quantity 0)
 * - body.branch_ids: number[]
 * Uses parseFloat(quantity) directly; no fallback to 0 when quantity is provided.
 */
function getBranchAssignments(body: any): { branch_id: number; quantity: number }[] {
  if (Array.isArray(body?.branchAssignments)) {
    return body.branchAssignments
      .map((a: any) => {
        const q = a?.quantity ?? a?.qty;
        const quantity = q !== undefined && q !== null ? parseFloat(q) : 0;
        if (q !== undefined && q !== null && Number.isNaN(quantity)) {
          throw new Error('Invalid quantity for branch ' + (a?.branch_id ?? a?.branchId));
        }
        return {
          branch_id: Number(a?.branch_id ?? a?.branchId ?? 0),
          quantity: Math.max(0, quantity),
        };
      })
      .filter((a) => a.branch_id > 0);
  }
  const raw = body?.branches ?? body?.branch_ids;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === 'object' && (first?.branch_id != null || first?.id != null)) {
      return raw
        .map((b: any) => {
          const q = b?.quantity ?? b?.qty;
          const quantity = q !== undefined && q !== null ? parseFloat(q) : 0;
          if (q !== undefined && q !== null && Number.isNaN(quantity)) {
            throw new Error('Invalid quantity for branch ' + (b?.branch_id ?? b?.id));
          }
          return {
            branch_id: Number(b?.branch_id ?? b?.id ?? 0),
            quantity: Math.max(0, quantity),
          };
        })
        .filter((a) => a.branch_id > 0);
    }
    // Do not default to quantity 0 when only branch ids provided; require explicit { branch_id, quantity }
    return [];
  }
  return [];
}

/**
 * Update product branch inventory: one transaction = DELETE old mappings then INSERT new.
 * PUT /api/admin/branch-inventory/product/:id
 * Body: branch_ids (number[]) or branchAssignments ({ branch_id, quantity? }[]).
 */
export async function updateProductBranchInventory(
  req: any,
  res: Response,
  deps: AdminRouteDeps
): Promise<void> {
  const { getShopIdOrFail, ensureBranchInventoryTable, hasColumn } = deps;
  try {
    const shopId = getShopIdOrFail(req, res);
    if (shopId === null) return;
    const productId = parseInt(String(req.params.productId ?? req.params.id ?? ''), 10);
    if (!productId || Number.isNaN(productId)) {
      res.status(400).json({ error: 'Invalid product id' });
      return;
    }
    console.log('Saving branches:', req.body?.branches);
    let assignments: { branch_id: number; quantity: number }[];
    try {
      assignments = getBranchAssignments(req.body);
    } catch (err: any) {
      res.status(400).json({ error: err?.message ?? 'Invalid branch/quantity data' });
      return;
    }
    await ensureBranchInventoryTable();
    const conn = await pool.getConnection();
    const shopIdNum = Number(shopId);
    const productIdNum = Number(productId);
    try {
      await conn.beginTransaction();
      for (const a of assignments) {
        const branchId = Number(a.branch_id);
        const qty = Number(a.quantity);
        await conn.execute(
          `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
          [shopIdNum, branchId, productIdNum, qty]
        );
      }
      const branchIds = assignments.map((a) => Number(a.branch_id));
      if (branchIds.length > 0) {
        const placeholders = branchIds.map(() => '?').join(',');
        const deleteParams: number[] = [shopIdNum, productIdNum, ...branchIds];
        await conn.execute(
          `DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ? AND branch_id NOT IN (${placeholders})`,
          deleteParams
        );
      } else {
        await conn.execute('DELETE FROM branch_inventory WHERE shop_id = ? AND product_id = ?', [shopIdNum, productIdNum]);
      }
      await conn.commit();
      const [verifyRows] = await pool.execute(
        'SELECT branch_id, product_id, quantity FROM branch_inventory WHERE product_id = ?',
        [productIdNum]
      );
      console.log('Saved rows:', assignments.length, 'branch_inventory for product', productId, '| Database result:', verifyRows);
      // Always sync product stock from sum of branch_inventory for all accounts.
      await pool.execute(
        'UPDATE products p SET p.stock_quantity = (SELECT IFNULL(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id) WHERE p.id = ? AND p.shop_id = ?',
        [productIdNum, shopIdNum]
      ).catch((err: any) => console.warn('[branch-inventory] global stock sync failed:', err?.message));
    } finally {
      conn.release();
    }
    const branch_ids = assignments.map((a) => a.branch_id);
    res.status(200).json({ ok: true, productId, branch_ids });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/** GET branch_ids and branches (with quantity) for a product. Used by Edit Product form rehydration. */
export async function getProductBranchIds(req: any, res: Response, deps: AdminRouteDeps): Promise<void> {
  try {
    const shopId = deps.getShopIdOrFail(req, res);
    if (shopId === null) return;
    const productId = parseInt(String(req.params.productId ?? req.params.id ?? ''), 10);
    if (!productId || Number.isNaN(productId)) {
      res.status(400).json({ error: 'Invalid product id' });
      return;
    }
    await deps.ensureBranchInventoryTable();
    const [rows] = await pool.execute(
      'SELECT branch_id, quantity FROM branch_inventory WHERE shop_id = ? AND product_id = ?',
      [shopId, productId]
    );
    const arr = (rows as any[]) || [];
    const branch_ids = arr.map((r) => Number(r.branch_id));
    const branches = arr.map((r) => ({
      branch_id: Number(r.branch_id),
      quantity: parseFloat(String(r.quantity ?? 0)) || 0,
    }));
    res.json({ productId, branch_ids, branches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/** Controller alias for route binding. */
export const updateBranchInventoryController = updateProductBranchInventory;

/**
 * Quick edit: update single branch quantity and re-sync global stock.
 * PUT /api/admin/branch-inventory/single
 * Body: { product_id or part_id, branch_id, quantity }
 */
export async function updateSingleBranchInventory(req: any, res: Response, deps: AdminRouteDeps): Promise<void> {
  try {
    const shopId = deps.getShopIdOrFail(req, res);
    if (shopId === null) return;
    const productId = req.body?.product_id != null ? Number(req.body.product_id) : (req.body?.part_id != null ? Number(req.body.part_id) : null);
    const branchId = req.body?.branch_id != null ? Number(req.body.branch_id) : null;
    const quantity = req.body?.quantity != null ? Math.max(0, Number(req.body.quantity)) : 0;
    if (!productId || !branchId || Number.isNaN(productId) || Number.isNaN(branchId)) {
      res.status(400).json({ success: false, message: 'product_id (or part_id) and branch_id required' });
      return;
    }
    await deps.ensureBranchInventoryTable();
    await pool.execute(
      `INSERT INTO branch_inventory (shop_id, branch_id, product_id, quantity) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = VALUES(quantity), updated_at = NOW()`,
      [shopId, branchId, productId, quantity]
    );
    const isBranchAccount = (req as any)?.user?.package === 'branches';
    if (isBranchAccount) {
      console.log('RUNNING BRANCH RECALC');
      await pool.execute(
        `UPDATE products p SET p.stock_quantity = (SELECT COALESCE(SUM(bi.quantity), 0) FROM branch_inventory bi WHERE bi.shop_id = p.shop_id AND bi.product_id = p.id) WHERE p.id = ? AND p.shop_id = ?`,
        [productId, shopId]
      );
    }
    res.status(200).json({ success: true, message: 'Branch inventory updated successfully', product_id: productId, branch_id: branchId, quantity });
  } catch (error: any) {
    console.error('Single branch update error:', error?.message || error);
    res.status(500).json({ success: false, message: error?.message || 'Internal server error' });
  }
}

/**
 * Create admin router. Mount at app.use('/api/admin', router).
 * CRITICAL: /branch-inventory/single must be before /branch-inventory/product/:id so "single" is not captured as :id.
 */
const invWrite = [requireShopCapability('inventory_full', 'inventory_branch')];
const invRead = [requireShopCapability('view_inventory', 'inventory_full', 'inventory_branch', 'pos')];

export function createAdminRouter(deps: AdminRouteDeps): Router {
  const router = Router();

  console.log('Branch inventory route registered');
  router.put('/branch-inventory/single', deps.authenticateToken, ...invWrite, (req: any, res: Response) =>
    updateSingleBranchInventory(req, res, deps)
  );
  router.put('/branch-inventory/product/:id', deps.authenticateToken, ...invWrite, (req: any, res: Response) =>
    updateBranchInventoryController(req, res, deps)
  );
  router.put('/branch-inventory/product/:productId', deps.authenticateToken, ...invWrite, (req: any, res: Response) =>
    updateBranchInventoryController(req, res, deps)
  );
  router.get('/branch-inventory/product/:id', deps.authenticateToken, ...invRead, (req: any, res: Response) =>
    getProductBranchIds(req, res, deps)
  );
  router.get('/branch-inventory/product/:productId', deps.authenticateToken, ...invRead, (req: any, res: Response) =>
    getProductBranchIds(req, res, deps)
  );

  if (deps.getStockMovements) {
    router.get('/stock-movements', deps.authenticateToken, ...invRead, (req: any, res: Response) =>
      deps.getStockMovements!(req, res)
    );
  }

  return router;
}
