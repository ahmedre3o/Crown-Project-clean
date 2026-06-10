'use client';

export function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type PurchasePrintLineFormatted = {
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export function buildPurchaseDocumentHtml(opts: {
  dir: 'rtl' | 'ltr';
  title: string;
  metaRows: { label: string; value: string }[];
  lines: PurchasePrintLineFormatted[];
  colProduct: string;
  colQty: string;
  colUnit: string;
  colLine: string;
  totalLabel: string;
  totalFormatted: string;
  /** اسم المحل / Store name — يعرض بدل Crown ERP */
  storeName?: string;
}): string {
  const storeName = (opts.storeName || 'Crown ERP').trim() || 'Crown ERP';
  const rows = opts.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.name)}</td><td class="num">${l.quantity}</td><td class="num">${escapeHtml(l.unitPrice)}</td><td class="num">${escapeHtml(l.lineTotal)}</td></tr>`
    )
    .join('');
  const meta = opts.metaRows
    .map((m) => `<div class="meta-row"><span class="meta-lbl">${escapeHtml(m.label)}</span> <span class="meta-val">${escapeHtml(m.value)}</span></div>`)
    .join('');
  const align = opts.dir === 'rtl' ? 'right' : 'left';
  const numAlign = opts.dir === 'rtl' ? 'left' : 'right';
  return `<!DOCTYPE html><html dir="${opts.dir}"><head><meta charset="UTF-8"><title>${escapeHtml(opts.title)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo',system-ui,sans-serif;padding:32px;max-width:820px;margin:0 auto;color:#1e293b;line-height:1.5}
.brand{font-weight:700;font-size:1.35rem;color:#0f172a;margin-bottom:8px;letter-spacing:-0.02em}
h1{font-size:1.2rem;font-weight:700;margin:0 0 16px;color:#0f172a;padding-bottom:12px;border-bottom:2px solid #0ea5e9}
.meta{display:flex;flex-wrap:wrap;gap:12px 24px;margin-bottom:24px;font-size:0.9rem}
.meta-row{display:flex;gap:6px}
.meta-lbl{color:#64748b;font-weight:600}
.meta-val{color:#1e293b}
table{border-collapse:collapse;width:100%;margin-top:16px;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)}
th,td{border:1px solid #e2e8f0;padding:12px 14px;text-align:${align}}
th{background:linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%);font-weight:600;color:#0f172a;font-size:0.9rem}
td{background:#fff;font-size:0.9rem}
tbody tr:nth-child(even) td{background:#f8fafc}
tbody tr:hover td{background:#f1f5f9}
td.num{text-align:${numAlign};font-variant-numeric:tabular-nums;font-weight:500}
.total-wrap{margin-top:20px;padding:16px 20px;background:linear-gradient(135deg,#0ea5e9 0%,#0284c7 100%);color:#fff;border-radius:8px;text-align:${align};font-weight:700;font-size:1.1rem}
.total{font-weight:700;font-size:1.05rem}
@media print{body{padding:16px}.brand{color:#000}.total-wrap{background:#0f172a!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="brand">${escapeHtml(storeName)}</div>
<h1>${escapeHtml(opts.title)}</h1>
<div class="meta">${meta}</div>
<table><thead><tr>
<th>${escapeHtml(opts.colProduct)}</th><th>${escapeHtml(opts.colQty)}</th><th>${escapeHtml(opts.colUnit)}</th><th>${escapeHtml(opts.colLine)}</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="total-wrap">${escapeHtml(opts.totalLabel)}: ${escapeHtml(opts.totalFormatted)}</div>
</body></html>`;
}

export function openPurchasePrint(html: string): void {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 200);
}
