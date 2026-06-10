/**
 * Crown AI Agent — Tool definitions + execution handlers.
 * Used by the /api/chat endpoint with Gemini Function Calling.
 */

import { Type } from '@google/genai';

const T = Type;

/* ------------------------------------------------------------------ */
/*  Function declarations (sent to Gemini with each request)          */
/* ------------------------------------------------------------------ */
export const CROWN_TOOL_DECLARATIONS = [
  {
    name: 'search_products',
    description:
      'Search for products in the shop inventory by name (Arabic or English), brand, SKU, or barcode. Returns matching products with price, stock, and details. Use when the user asks about a product or before creating a sale.',
    parameters: {
      type: T.OBJECT,
      properties: {
        query: {
          type: T.STRING,
          description: 'Product name, brand, SKU, or barcode to search for (Arabic or English).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_sale',
    description:
      'Create a new POS sale / invoice. Each item must include productId and quantity. Use ONLY after confirming with the user. If the user asks to create a sale, FIRST search products, show a summary, and WAIT for confirmation before calling this.',
    parameters: {
      type: T.OBJECT,
      properties: {
        items: {
          type: T.ARRAY,
          description: 'Array of items to sell.',
          items: {
            type: T.OBJECT,
            properties: {
              productId: { type: T.INTEGER, description: 'Product ID from search_products.' },
              quantity: { type: T.NUMBER, description: 'Quantity to sell.' },
            },
            required: ['productId', 'quantity'],
          },
        },
        customerName: { type: T.STRING, description: 'Customer name (optional).' },
        paymentMethod: {
          type: T.STRING,
          description: 'Payment method: cash, card, or credit. Defaults to cash.',
        },
      },
      required: ['items'],
    },
  },
  {
    name: 'add_product',
    description:
      'Add a new product to the shop inventory. Use when the user explicitly asks to add/create a new product. Ask for confirmation before executing.',
    parameters: {
      type: T.OBJECT,
      properties: {
        nameAr: { type: T.STRING, description: 'Product name in Arabic.' },
        nameEn: { type: T.STRING, description: 'Product name in English.' },
        sellPrice: { type: T.NUMBER, description: 'Selling price.' },
        buyPrice: { type: T.NUMBER, description: 'Purchase/cost price (optional).' },
        stockQuantity: { type: T.INTEGER, description: 'Initial stock quantity. Defaults to 0.' },
        category: { type: T.STRING, description: 'Product category (optional).' },
        sku: { type: T.STRING, description: 'SKU code (optional).' },
        barcode: { type: T.STRING, description: 'Barcode (optional).' },
      },
      required: ['sellPrice'],
    },
  },
  {
    name: 'update_product_price',
    description:
      'Update the selling price of an existing product. Use when the user asks to change a price. Requires product ID (use search_products first) and the new price.',
    parameters: {
      type: T.OBJECT,
      properties: {
        productId: { type: T.INTEGER, description: 'Product ID.' },
        newPrice: { type: T.NUMBER, description: 'New selling price.' },
      },
      required: ['productId', 'newPrice'],
    },
  },
  {
    name: 'update_stock',
    description:
      'Set or adjust the stock quantity of a product. Use when the user asks to update inventory quantity.',
    parameters: {
      type: T.OBJECT,
      properties: {
        productId: { type: T.INTEGER, description: 'Product ID.' },
        quantity: { type: T.INTEGER, description: 'New stock quantity to SET (absolute, not delta).' },
      },
      required: ['productId', 'quantity'],
    },
  },
  {
    name: 'get_dashboard_stats',
    description:
      "Get today's dashboard statistics: total revenue, number of invoices, yesterday comparison, total products, low stock count. Use when the user asks about today's sales, revenue, or general stats.",
    parameters: { type: T.OBJECT, properties: {} },
  },
  {
    name: 'get_low_stock_products',
    description:
      'Get products that are low in stock (at or below their minimum stock level). Use when the user asks about low stock, products running out, or reorder alerts.',
    parameters: {
      type: T.OBJECT,
      properties: {
        limit: { type: T.INTEGER, description: 'Max number of results. Defaults to 20.' },
      },
    },
  },
  {
    name: 'get_recent_invoices',
    description:
      'Get recent sales invoices from the last 7 days. Use when the user asks about recent sales, invoices, or order history.',
    parameters: {
      type: T.OBJECT,
      properties: {
        limit: { type: T.INTEGER, description: 'Max number of invoices. Defaults to 10.' },
      },
    },
  },
  {
    name: 'get_invoice_details',
    description:
      'Get full details of a specific invoice by ID or invoice number, including all items. Use when the user asks to view or print a specific invoice.',
    parameters: {
      type: T.OBJECT,
      properties: {
        invoiceId: { type: T.INTEGER, description: 'Sale/invoice ID.' },
        invoiceNumber: { type: T.STRING, description: 'Invoice number string (e.g. INV-2026-0001).' },
      },
    },
  },
];

/* ------------------------------------------------------------------ */
/*  Tool execution handlers                                           */
/* ------------------------------------------------------------------ */

export interface ToolContext {
  pool: any;
  shopId: number;
  userId: number | null;
  userRole: string;
  lang: 'ar' | 'en';
}

type ToolResult = { ok: boolean; data?: any; error?: string };

async function exec_search_products(ctx: ToolContext, args: any): Promise<ToolResult> {
  const q = String(args?.query || '').trim();
  if (!q) return { ok: false, error: ctx.lang === 'ar' ? 'يرجى تحديد اسم المنتج للبحث.' : 'Please specify a product name to search.' };
  const like = `%${q}%`;
  const [rows] = await ctx.pool.execute(
    `SELECT id, name_ar, name_en, brand, sku, barcode, sell_price, buy_price, stock_quantity, min_stock_level, category
     FROM products WHERE shop_id = ? AND (name_ar LIKE ? OR name_en LIKE ? OR brand LIKE ? OR sku LIKE ? OR barcode LIKE ?)
     ORDER BY stock_quantity DESC LIMIT 15`,
    [ctx.shopId, like, like, like, like, like]
  );
  const products = (rows as any[]).map((r: any) => ({
    id: r.id,
    nameAr: r.name_ar,
    nameEn: r.name_en,
    brand: r.brand,
    sku: r.sku,
    barcode: r.barcode,
    sellPrice: Number(r.sell_price || 0),
    buyPrice: Number(r.buy_price || 0),
    stock: Number(r.stock_quantity || 0),
    minStock: Number(r.min_stock_level || 0),
    category: r.category,
  }));
  if (products.length === 0) {
    return { ok: true, data: { products: [], message: ctx.lang === 'ar' ? `لم يتم العثور على منتجات تطابق "${q}"` : `No products found matching "${q}"` } };
  }
  return { ok: true, data: { products, count: products.length } };
}

async function exec_create_sale(ctx: ToolContext, args: any): Promise<ToolResult> {
  const items = args?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: ctx.lang === 'ar' ? 'يرجى تحديد المنتجات والكميات.' : 'Please specify products and quantities.' };
  }

  const connection = await ctx.pool.getConnection();
  try {
    await connection.beginTransaction();

    let totalAmount = 0;
    const saleItems: { productId: number; quantity: number; unitPrice: number; name: string }[] = [];

    for (const item of items) {
      const pid = Number(item.productId);
      const qty = Number(item.quantity);
      if (!pid || !qty || qty <= 0) continue;

      const [pRows] = await connection.execute(
        'SELECT id, name_ar, name_en, sell_price, stock_quantity FROM products WHERE id = ? AND shop_id = ?',
        [pid, ctx.shopId]
      );
      const product = (pRows as any[])[0];
      if (!product) {
        await connection.rollback();
        return { ok: false, error: ctx.lang === 'ar' ? `المنتج رقم ${pid} غير موجود.` : `Product #${pid} not found.` };
      }
      if (Number(product.stock_quantity) < qty) {
        await connection.rollback();
        const name = product.name_ar || product.name_en;
        return { ok: false, error: ctx.lang === 'ar' ? `الكمية المطلوبة من "${name}" (${qty}) أكبر من المخزون (${product.stock_quantity}).` : `Requested quantity for "${name}" (${qty}) exceeds stock (${product.stock_quantity}).` };
      }
      const unitPrice = Number(product.sell_price || 0);
      totalAmount += unitPrice * qty;
      saleItems.push({ productId: pid, quantity: qty, unitPrice, name: product.name_ar || product.name_en });
    }

    if (saleItems.length === 0) {
      await connection.rollback();
      return { ok: false, error: ctx.lang === 'ar' ? 'لا توجد منتجات صالحة للبيع.' : 'No valid products to sell.' };
    }

    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const [lastInv] = await connection.execute(
      `SELECT invoice_number FROM sales WHERE shop_id = ? AND invoice_number LIKE ? ORDER BY id DESC LIMIT 1`,
      [ctx.shopId, `${prefix}%`]
    );
    const lastNum = (lastInv as any[])[0]?.invoice_number
      ? parseInt(String((lastInv as any[])[0].invoice_number).replace(prefix, ''), 10)
      : 0;
    const invoiceNumber = `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
    const paymentMethod = String(args?.paymentMethod || 'cash').toLowerCase();
    const customerName = String(args?.customerName || '').trim() || null;

    const [saleResult] = await connection.execute(
      `INSERT INTO sales (shop_id, user_id, invoice_number, total_amount, payment_method, customer_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [ctx.shopId, ctx.userId, invoiceNumber, totalAmount, paymentMethod, customerName]
    );
    const saleId = (saleResult as any).insertId;

    for (const si of saleItems) {
      await connection.execute(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?)`,
        [saleId, si.productId, si.quantity, si.unitPrice, si.unitPrice * si.quantity]
      );
      await connection.execute(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND shop_id = ?',
        [si.quantity, si.productId, ctx.shopId]
      );
    }

    await connection.commit();

    return {
      ok: true,
      data: {
        saleId,
        invoiceNumber,
        totalAmount,
        paymentMethod,
        customerName,
        itemCount: saleItems.length,
        items: saleItems.map((si) => ({ name: si.name, qty: si.quantity, price: si.unitPrice, total: si.unitPrice * si.quantity })),
      },
    };
  } catch (e: any) {
    await connection.rollback();
    return { ok: false, error: e?.message || 'Failed to create sale' };
  } finally {
    connection.release();
  }
}

async function exec_add_product(ctx: ToolContext, args: any): Promise<ToolResult> {
  const nameAr = String(args?.nameAr || args?.nameEn || '').trim();
  const nameEn = String(args?.nameEn || args?.nameAr || '').trim();
  const sellPrice = Number(args?.sellPrice || 0);
  if (!nameAr && !nameEn) return { ok: false, error: ctx.lang === 'ar' ? 'يرجى تحديد اسم المنتج.' : 'Product name is required.' };
  if (sellPrice <= 0) return { ok: false, error: ctx.lang === 'ar' ? 'يرجى تحديد سعر البيع.' : 'Selling price is required.' };

  const buyPrice = Number(args?.buyPrice || 0);
  const stockQty = Number(args?.stockQuantity || 0);
  const category = String(args?.category || '').trim() || null;
  const sku = String(args?.sku || '').trim() || null;
  const barcode = String(args?.barcode || '').trim() || null;

  const [result] = await ctx.pool.execute(
    `INSERT INTO products (shop_id, name_ar, name_en, sell_price, buy_price, stock_quantity, category, sku, barcode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ctx.shopId, nameAr || null, nameEn || null, sellPrice, buyPrice, stockQty, category, sku, barcode]
  );
  return {
    ok: true,
    data: {
      productId: (result as any).insertId,
      nameAr,
      nameEn,
      sellPrice,
      stockQuantity: stockQty,
    },
  };
}

async function exec_update_product_price(ctx: ToolContext, args: any): Promise<ToolResult> {
  const pid = Number(args?.productId);
  const newPrice = Number(args?.newPrice);
  if (!pid) return { ok: false, error: ctx.lang === 'ar' ? 'يرجى تحديد رقم المنتج.' : 'Product ID is required.' };
  if (newPrice <= 0) return { ok: false, error: ctx.lang === 'ar' ? 'يرجى تحديد السعر الجديد.' : 'New price is required.' };

  const [rows] = await ctx.pool.execute('SELECT id, name_ar, name_en, sell_price FROM products WHERE id = ? AND shop_id = ?', [pid, ctx.shopId]);
  const product = (rows as any[])[0];
  if (!product) return { ok: false, error: ctx.lang === 'ar' ? 'المنتج غير موجود.' : 'Product not found.' };

  await ctx.pool.execute('UPDATE products SET sell_price = ? WHERE id = ? AND shop_id = ?', [newPrice, pid, ctx.shopId]);
  return {
    ok: true,
    data: {
      productId: pid,
      name: product.name_ar || product.name_en,
      oldPrice: Number(product.sell_price),
      newPrice,
    },
  };
}

async function exec_update_stock(ctx: ToolContext, args: any): Promise<ToolResult> {
  const pid = Number(args?.productId);
  const qty = Number(args?.quantity);
  if (!pid) return { ok: false, error: ctx.lang === 'ar' ? 'يرجى تحديد رقم المنتج.' : 'Product ID is required.' };
  if (qty < 0) return { ok: false, error: ctx.lang === 'ar' ? 'الكمية يجب أن تكون 0 أو أكثر.' : 'Quantity must be 0 or more.' };

  const [rows] = await ctx.pool.execute('SELECT id, name_ar, name_en, stock_quantity FROM products WHERE id = ? AND shop_id = ?', [pid, ctx.shopId]);
  const product = (rows as any[])[0];
  if (!product) return { ok: false, error: ctx.lang === 'ar' ? 'المنتج غير موجود.' : 'Product not found.' };

  await ctx.pool.execute('UPDATE products SET stock_quantity = ? WHERE id = ? AND shop_id = ?', [qty, pid, ctx.shopId]);
  return {
    ok: true,
    data: {
      productId: pid,
      name: product.name_ar || product.name_en,
      oldStock: Number(product.stock_quantity),
      newStock: qty,
    },
  };
}

async function exec_get_dashboard_stats(ctx: ToolContext): Promise<ToolResult> {
  const revenueFilter = `AND (s.payment_status IS NULL OR s.payment_status = '' OR s.payment_status = 'paid')
    AND (s.return_status IS NULL OR s.return_status = '' OR s.return_status != 'full')`;
  const revenueSum = 'COALESCE(SUM(s.total_amount - COALESCE(s.returned_amount, 0)), 0)';

  const [[todayRows], [yesterdayRows], [prodRows], [lowRows]] = await Promise.all([
    ctx.pool.execute(`SELECT ${revenueSum} as revenue, COUNT(DISTINCT s.id) as invoices FROM sales s WHERE s.shop_id = ? AND DATE(s.created_at) = CURRENT_DATE() ${revenueFilter}`, [ctx.shopId]),
    ctx.pool.execute(`SELECT ${revenueSum} as revenue, COUNT(DISTINCT s.id) as invoices FROM sales s WHERE s.shop_id = ? AND DATE(s.created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY) ${revenueFilter}`, [ctx.shopId]),
    ctx.pool.execute('SELECT COUNT(*) as c FROM products WHERE shop_id = ?', [ctx.shopId]),
    ctx.pool.execute('SELECT COUNT(*) as c FROM products WHERE shop_id = ? AND stock_quantity <= min_stock_level', [ctx.shopId]),
  ]);

  const today = (todayRows as any[])[0] || {};
  const yesterday = (yesterdayRows as any[])[0] || {};

  return {
    ok: true,
    data: {
      today: { revenue: Number(today.revenue || 0), invoices: Number(today.invoices || 0) },
      yesterday: { revenue: Number(yesterday.revenue || 0), invoices: Number(yesterday.invoices || 0) },
      totalProducts: Number((prodRows as any[])[0]?.c || 0),
      lowStockCount: Number((lowRows as any[])[0]?.c || 0),
    },
  };
}

async function exec_get_low_stock(ctx: ToolContext, args: any): Promise<ToolResult> {
  const limit = Math.min(Math.max(Number(args?.limit || 20), 1), 50);
  const [rows] = await ctx.pool.execute(
    `SELECT id, name_ar, name_en, stock_quantity, min_stock_level, sell_price, category
     FROM products WHERE shop_id = ? AND stock_quantity <= min_stock_level
     ORDER BY stock_quantity ASC LIMIT ?`,
    [ctx.shopId, limit]
  );
  const products = (rows as any[]).map((r: any) => ({
    id: r.id,
    nameAr: r.name_ar,
    nameEn: r.name_en,
    stock: Number(r.stock_quantity || 0),
    minStock: Number(r.min_stock_level || 0),
    sellPrice: Number(r.sell_price || 0),
    category: r.category,
  }));
  return { ok: true, data: { products, count: products.length } };
}

async function exec_get_recent_invoices(ctx: ToolContext, args: any): Promise<ToolResult> {
  const limit = Math.min(Math.max(Number(args?.limit || 10), 1), 30);
  const [rows] = await ctx.pool.execute(
    `SELECT id, invoice_number, total_amount, payment_method, customer_name, created_at
     FROM sales WHERE shop_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     ORDER BY created_at DESC LIMIT ?`,
    [ctx.shopId, limit]
  );
  const invoices = (rows as any[]).map((r: any) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    total: Number(r.total_amount || 0),
    paymentMethod: r.payment_method,
    customer: r.customer_name,
    date: r.created_at,
  }));
  return { ok: true, data: { invoices, count: invoices.length } };
}

async function exec_get_invoice_details(ctx: ToolContext, args: any): Promise<ToolResult> {
  const invoiceId = Number(args?.invoiceId || 0);
  const invoiceNumber = String(args?.invoiceNumber || '').trim();

  let saleRow: any = null;
  if (invoiceId) {
    const [rows] = await ctx.pool.execute('SELECT * FROM sales WHERE id = ? AND shop_id = ?', [invoiceId, ctx.shopId]);
    saleRow = (rows as any[])[0];
  } else if (invoiceNumber) {
    const [rows] = await ctx.pool.execute('SELECT * FROM sales WHERE invoice_number = ? AND shop_id = ?', [invoiceNumber, ctx.shopId]);
    saleRow = (rows as any[])[0];
  }
  if (!saleRow) return { ok: false, error: ctx.lang === 'ar' ? 'الفاتورة غير موجودة.' : 'Invoice not found.' };

  const [itemRows] = await ctx.pool.execute(
    `SELECT si.*, p.name_ar, p.name_en FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?`,
    [saleRow.id]
  );
  const items = (itemRows as any[]).map((r: any) => ({
    productId: r.product_id,
    name: r.name_ar || r.name_en || `Product #${r.product_id}`,
    quantity: Number(r.quantity || 0),
    unitPrice: Number(r.unit_price || 0),
    total: Number(r.total || 0),
  }));

  return {
    ok: true,
    data: {
      id: saleRow.id,
      invoiceNumber: saleRow.invoice_number,
      totalAmount: Number(saleRow.total_amount || 0),
      paymentMethod: saleRow.payment_method,
      customerName: saleRow.customer_name,
      createdAt: saleRow.created_at,
      items,
      printUrl: `/invoices?print=${saleRow.id}`,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Router: dispatch tool name → handler                              */
/* ------------------------------------------------------------------ */

const WRITE_TOOLS = new Set(['create_sale', 'add_product', 'update_product_price', 'update_stock']);

export function isWriteTool(name: string): boolean {
  return WRITE_TOOLS.has(name);
}

export async function executeTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
  switch (name) {
    case 'search_products':
      return exec_search_products(ctx, args);
    case 'create_sale':
      return exec_create_sale(ctx, args);
    case 'add_product':
      return exec_add_product(ctx, args);
    case 'update_product_price':
      return exec_update_product_price(ctx, args);
    case 'update_stock':
      return exec_update_stock(ctx, args);
    case 'get_dashboard_stats':
      return exec_get_dashboard_stats(ctx);
    case 'get_low_stock_products':
      return exec_get_low_stock(ctx, args);
    case 'get_recent_invoices':
      return exec_get_recent_invoices(ctx, args);
    case 'get_invoice_details':
      return exec_get_invoice_details(ctx, args);
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}
