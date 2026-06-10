/**
 * Display stock: for normal accounts (no branches), bind directly to product.stock_quantity.
 * For multi-branch, sum branches when present. Backend uses products.stock_quantity as sole source of truth on GET.
 */
export function getDisplayStock(product: {
  branches?: Array<{ quantity?: number }>;
  stock_quantity?: number;
  quantity?: number;
  available_stock?: number;
}): number {
  if (product.branches && product.branches.length > 0) {
    return product.branches.reduce((sum, b) => sum + Number(b.quantity ?? 0), 0);
  }
  return Number(
    product.stock_quantity ?? product.quantity ?? product.available_stock ?? 0
  );
}
