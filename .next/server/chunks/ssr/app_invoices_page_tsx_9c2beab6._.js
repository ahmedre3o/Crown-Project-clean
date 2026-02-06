module.exports=[41336,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(50944),e=a.i(14942),f=a.i(27452),g=a.i(47036),h=a.i(66392);function i(){let a=(0,d.useSearchParams)(),i=a.get("focus"),j=a.get("source"),{t:k,direction:l,language:m}=(0,f.useLanguage)(),{symbol:n}=(0,h.useCurrency)(),[o,p]=(0,c.useState)([]),[q,r]=(0,c.useState)(null),[s,t]=(0,c.useState)(!0),[u,v]=(0,c.useState)(null),[w,x]=(0,c.useState)(null),[y,z]=(0,c.useState)({}),[A,B]=(0,c.useState)(null),[C,D]=(0,c.useState)("online"===j?"online":"pos"===j?"pos":"all"),[E,F]=(0,c.useState)(""),[G,H]=(0,c.useState)(null),I=(0,c.useRef)(!1);(0,c.useEffect)(()=>{"online"===j?D("online"):"pos"===j&&D("pos")},[j]),(0,c.useEffect)(()=>{let a=setTimeout(()=>{J()},350*!!E.trim());return()=>clearTimeout(a)},[C,E]),(0,c.useEffect)(()=>{if(i&&o.length>0&&!I.current){let a=parseInt(i,10);Number.isFinite(a)&&o.some(b=>b.id===a)&&(x(a),I.current=!0)}},[i,o]);let J=async()=>{try{t(!0),v(null);let[a,...b]=await Promise.all([(0,g.apiRequest)("/shops/profile")]);if(r(a),"online"===C){let a=new URLSearchParams({limit:"200"});E.trim()&&a.set("query",E.trim());let b=await (0,g.apiRequest)(`/admin/online-invoices?${a.toString()}`);p((b||[]).map(a=>({...a,invoiceSource:"online",total_amount:a.total,created_at:a.order_created_at||a.created_at,print_count:a.printed_count,customer_phone:a.phone})))}else if("pos"===C){let a=new URLSearchParams({limit:"200",source:"pos"});E.trim()&&a.set("search",E.trim());let b=await (0,g.apiRequest)(`/sales?${a.toString()}`);p((b||[]).map(a=>({...a,invoiceSource:"pos"})))}else{let[a,b]=await Promise.all([(0,g.apiRequest)("/sales?limit=200&source=pos"),(0,g.apiRequest)("/admin/online-invoices?limit=200")]),c=(a||[]).map(a=>({...a,invoiceSource:"pos"})),d=(b||[]).map(a=>({...a,invoiceSource:"online",total_amount:a.total,created_at:a.order_created_at||a.created_at,print_count:a.printed_count,customer_phone:a.phone}));p([...d,...c].sort((a,b)=>new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()))}}catch(a){v(a.message||"Failed to load invoices")}finally{t(!1)}},K=async(a,b)=>{if(w===a)return void x(null);if(x(a),!y[a])try{let c=b?.invoiceSource==="online"?(await (0,g.apiRequest)(`/admin/online-invoices/${a}`))?.items||[]:await (0,g.apiRequest)(`/sales/${a}/items`);z(b=>({...b,[a]:c}))}catch(a){}},L=async a=>{try{B(a.id),v(null);let c="online"===a.invoiceSource,d=y[a.id];d||(d=c?(await (0,g.apiRequest)(`/admin/online-invoices/${a.id}`))?.items||[]:await (0,g.apiRequest)(`/sales/${a.id}/items`),z(b=>({...b,[a.id]:d})));let e=Number(a.print_count||a.printed_count||0),f=0,h=null;try{if(c){let b=await (0,g.apiRequest)(`/admin/online-invoices/${a.id}/print`,{method:"POST"});f=Number(b?.printCount||0),h=b?.lastPrintedAt||null}else{let b=await (0,g.apiRequest)(`/sales/${a.id}/print`,{method:"POST"});f=Number(b?.printCount||0),h=b?.lastPrintedAt||null}p(b=>b.map(b=>b.id===a.id?{...b,print_count:f,printed_count:f,last_printed_at:h}:b))}catch{}if(e>0){var b;let c=a.last_printed_at?new Date(a.last_printed_at).toLocaleString("ar"===m?"ar-EG":"en-US"):"";b="ar"===m?`تنبيه: تمت طباعة الفاتورة من قبل (آخر طباعة: ${c})`:`Warning: invoice was printed before (last printed: ${c})`,H(b),setTimeout(()=>H(null),4e3)}let i=window.open("","_blank");if(!i)return;let j=f&&f>1?`Duplicate Copy No. ${Math.max(1,f-1)}`:"",k=(d||[]).map(a=>{let b=a.name_snapshot||("ar"===m?a.name_ar:a.name_en),c=a.total_price??Number(a.price_snapshot||0)*Number(a.quantity||0);return`
            <div class="item">
              <span class="item-name">${b}</span>
              <span class="item-qty">${Number(a.quantity||0)}x</span>
              <span class="item-price">${Number(c).toFixed(2)} ${n}</span>
            </div>
          `}).join(""),l=`
        <!DOCTYPE html>
        <html dir="${"ar"===m?"rtl":"ltr"}" lang="${m}">
          <head>
            <meta charset="UTF-8">
            <title>Receipt - ${a.invoice_number||a.id}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: 'Orbitron', monospace;
                background: #ffffff;
                color: #111827;
                padding: 24px;
                line-height: 1.6;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .receipt {
                width: 100%;
                max-width: 800px;
                margin: 0 auto;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 24px;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                min-height: 70vh;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 1px solid #e5e7eb;
                padding-bottom: 20px;
              }
              .header h1 {
                font-size: 34px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 3px;
                margin-bottom: 10px;
              }
              .header p {
                font-size: 12px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 2px;
              }
              .copy-label {
                display: inline-block;
                margin-top: 10px;
                padding: 6px 12px;
                border-radius: 999px;
                border: 2px solid #ef4444;
                color: #991b1b;
                background: #fee2e2;
                font-weight: 900;
                font-size: 12px;
                letter-spacing: 1px;
                text-transform: uppercase;
              }
              .info {
                margin-bottom: 25px;
                font-size: 11px;
                color: #4b5563;
              }
              .items { margin-bottom: 25px; }
              .item {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e5e7eb;
                font-size: 13px;
              }
              .item-name { flex: 1; color: #111827; }
              .item-qty { margin: 0 15px; color: #6b7280; }
              .item-price { color: #111827; font-weight: 700; }
              .total {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                font-size: 20px;
                font-weight: 700;
                text-transform: uppercase;
              }
              .footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #6b7280;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              @media print {
                @page { size: auto portrait; margin: 8mm; }
                body { padding: 0; }
                .receipt {
                  box-shadow: none;
                  border-color: #d1d5db;
                  width: 100%;
                  max-width: 210mm;
                  min-height: 100%;
                  page-break-inside: avoid;
                }
                .footer { margin-top: auto; }
              }
              @media print and (max-width: 90mm) {
                .receipt { max-width: 80mm; }
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <div class="content">
                <div class="header">
                  ${q?.logo_url?`<img src="${q.logo_url}" alt="Logo" style="height: 48px; margin-bottom: 8px;" />`:""}
                  <h1>${q?.business_name||"Crown Services"}</h1>
                  <p>${q?.activity_type||("ar"===m?"تاج الخدمات":"Services ERP")}</p>
                  ${j?`<div class="copy-label">${j}</div>`:""}
                </div>
                <div class="info">
                  <p>Invoice # / رقم الفاتورة: ${"online"===a.invoiceSource?`ON-${a.invoice_number}`:a.invoice_serial||a.invoice_number||a.id}</p>
                  <p>Date / التاريخ: ${new Date(a.created_at??Date.now()).toLocaleString("ar"===m?"ar-SA":"en-US")}</p>
                  <p>Cashier / الكاشير: ${a.cashier_name||"N/A"}</p>
                  <p>Customer / العميل: ${a.customer_name||("ar"===m?"عميل مباشر":"Walk-in")}</p>
                  ${a.customer_phone||a.phone?`<p>Phone / الهاتف: ${a.customer_phone||a.phone}</p>`:""}
                  ${a.customer_address||a.address?`<p>Address / العنوان: ${a.customer_address||a.address}</p>`:""}
                  ${q?.address?`<p>Shop Address: ${q.address}</p>`:""}
                  ${q?.contact_phone?`<p>Shop Phone: ${q.contact_phone}</p>`:""}
                </div>
                <div class="items">
                  <div class="item" style="font-weight: 700;">
                    <span class="item-name">Item / الصنف</span>
                    <span class="item-qty">Qty / الكمية</span>
                    <span class="item-price">Price / السعر</span>
                  </div>
                  ${k||""}
                </div>
                <div class="total">
                  <span>Total / الإجمالي</span>
                  <span>${Number(a.total_amount??a.total??0).toFixed(2)} ${n}</span>
                </div>
              </div>
              <div class="footer">
                <p>Thank you for your visit! / شكراً لزيارتكم!</p>
                <p>Powered by Crown Services | www.crowncs.org</p>
              </div>
            </div>
          </body>
        </html>
      `;i.document.write(l),i.document.close(),setTimeout(()=>{i.print()},500)}catch(a){v(a.message||"Failed to print invoice")}finally{B(null)}};return(0,b.jsxs)("div",{className:"min-h-screen bg-black text-white flex",dir:l,children:[(0,b.jsx)(e.Sidebar,{}),(0,b.jsxs)("div",{className:"flex-1 p-8 pt-20 md:pt-8 overflow-y-auto",children:[(0,b.jsx)("h1",{className:"text-2xl font-bold text-cyan-200 mb-6",children:k("invoices.title")}),(0,b.jsxs)("div",{className:"flex flex-wrap gap-2 mb-4",children:[(0,b.jsx)("button",{onClick:()=>D("all"),className:`px-4 py-2 rounded-xl text-sm font-semibold transition ${"all"===C?"bg-cyan-600 text-white":"border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"}`,children:"ar"===m?"الكل":"All"}),(0,b.jsx)("button",{onClick:()=>D("pos"),className:`px-4 py-2 rounded-xl text-sm font-semibold transition ${"pos"===C?"bg-cyan-600 text-white":"border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"}`,children:"POS"}),(0,b.jsx)("button",{onClick:()=>D("online"),className:`px-4 py-2 rounded-xl text-sm font-semibold transition ${"online"===C?"bg-cyan-600 text-white":"border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10"}`,children:"ar"===m?"أونلاين":"Online"}),(0,b.jsx)("input",{type:"search",value:E,onChange:a=>F(a.target.value),placeholder:"ar"===m?"ابحث برقم الفاتورة / الهاتف / اسم العميل...":"Search by invoice #, phone, customer name...",className:"flex-1 min-w-[180px] px-4 py-2 rounded-xl border border-cyan-500/30 bg-black/30 text-slate-100 placeholder:text-slate-500"})]}),G&&(0,b.jsx)("div",{className:"mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200",children:G}),(0,b.jsxs)("div",{className:"neon-card rounded-xl p-6",children:[u&&(0,b.jsx)("div",{className:"mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200",children:u}),q&&(0,b.jsxs)("div",{className:"mb-6 rounded-lg border border-cyan-500/20 p-4 text-sm text-slate-300 flex items-center gap-4",children:[q.logo_url?(0,b.jsx)("img",{src:q.logo_url,alt:"Logo",className:"h-12 w-12 rounded-md object-cover border border-cyan-500/20"}):(0,b.jsx)("div",{className:"h-12 w-12 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60",children:q.business_name?.[0]||"C"}),(0,b.jsxs)("div",{children:[(0,b.jsx)("div",{className:"font-semibold text-cyan-200",children:q.business_name||q.owner_name}),(0,b.jsx)("div",{children:q.activity_type||""}),(0,b.jsx)("div",{children:q.address||""}),(0,b.jsx)("div",{children:q.contact_phone||""}),(0,b.jsx)("div",{children:q.contact_email||""})]})]}),s?(0,b.jsx)("div",{className:"text-sm text-slate-300",children:k("common.loading")}):(0,b.jsx)("div",{className:"overflow-x-auto",children:(0,b.jsxs)("table",{className:"w-full text-sm",children:[(0,b.jsx)("thead",{className:"text-cyan-400 border-b border-cyan-500/20",children:(0,b.jsxs)("tr",{children:[(0,b.jsx)("th",{className:"py-2 text-left",children:"#"}),(0,b.jsx)("th",{className:"py-2 text-left",children:"ar"===m?"العميل":"Customer"}),(0,b.jsx)("th",{className:"py-2 text-left",children:"ar"===m?"التاريخ":"Date"}),(0,b.jsx)("th",{className:"py-2 text-left",children:"ar"===m?"الإجمالي":"Total"}),(0,b.jsx)("th",{className:"py-2 text-left",children:"ar"===m?"تفاصيل":"Details"})]})}),(0,b.jsx)("tbody",{className:"text-slate-200",children:0===o.length?(0,b.jsx)("tr",{children:(0,b.jsx)("td",{colSpan:5,className:"py-4 text-center text-slate-500",children:"ar"===m?"لا توجد فواتير":"No invoices found"})}):o.map(a=>(0,b.jsxs)(c.default.Fragment,{children:[(0,b.jsxs)("tr",{className:"border-b border-cyan-500/10",children:[(0,b.jsx)("td",{className:"py-2",children:(0,b.jsxs)("div",{className:"flex items-center gap-2 flex-wrap",children:[(0,b.jsx)("span",{children:"online"===a.invoiceSource?`ON-${a.invoice_number}`:a.invoice_serial||a.invoice_number||a.id}),("online"===a.source||a.online_order_id)&&(0,b.jsx)("span",{className:"text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-200",children:"ar"===m?"أونلاين":"Online"}),(!a.source||"pos"===a.source)&&!a.online_order_id&&(0,b.jsx)("span",{className:"text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-200",children:"POS"}),(a.print_count??a.printed_count??0)>=1&&(0,b.jsx)("span",{className:"text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-200",children:"ar"===m?`تمت الطباعة (${a.print_count??a.printed_count})`:`Printed #${a.print_count??a.printed_count}`})]})}),(0,b.jsxs)("td",{className:"py-2",children:[(0,b.jsx)("div",{children:a.customer_name||("ar"===m?"عميل مباشر":"Walk-in")}),(0,b.jsx)("div",{className:"text-xs text-slate-400",children:a.customer_phone||""})]}),(0,b.jsx)("td",{className:"py-2",children:new Date(a.created_at??Date.now()).toLocaleString("ar"===m?"ar-SA":"en-US")}),(0,b.jsxs)("td",{className:"py-2",children:[Number(a.total_amount??a.total??0).toFixed(2)," ",n]}),(0,b.jsx)("td",{className:"py-2",children:(0,b.jsx)("button",{onClick:()=>K(a.id,a),className:"text-cyan-300 hover:text-cyan-200 text-xs",children:w===a.id?"ar"===m?"إخفاء التفاصيل":"Hide details":"ar"===m?"عرض التفاصيل":"View details"})})]}),w===a.id&&(0,b.jsx)("tr",{className:"border-b border-cyan-500/10 bg-[#0f172a]",children:(0,b.jsxs)("td",{colSpan:5,className:"py-3",children:[(0,b.jsxs)("div",{className:"text-xs text-slate-400 mb-2 space-y-1",children:[(0,b.jsx)("div",{children:a.customer_address||""}),(0,b.jsxs)("div",{children:["ar"===m?"الكاشير":"Cashier",": ",a.cashier_name||"—"]}),(0,b.jsxs)("div",{children:["ar"===m?"طريقة الدفع":"Payment",": ",a.payment_method]}),(0,b.jsx)("div",{className:"pt-2",children:(0,b.jsx)("button",{onClick:()=>L(a),disabled:A===a.id,className:"text-cyan-300 hover:text-cyan-200 text-xs border border-cyan-500/30 rounded-md px-3 py-1",children:A===a.id?"ar"===m?"جاري الطباعة...":"Printing...":"ar"===m?"طباعة":"Print"})})]}),(0,b.jsx)("div",{className:"overflow-x-auto",children:(0,b.jsxs)("table",{className:"w-full text-xs",children:[(0,b.jsx)("thead",{className:"text-cyan-300",children:(0,b.jsxs)("tr",{children:[(0,b.jsx)("th",{className:"text-left py-1",children:"ar"===m?"المنتج":"Product"}),(0,b.jsx)("th",{className:"text-left py-1",children:"ar"===m?"الكمية":"Qty"}),(0,b.jsx)("th",{className:"text-left py-1",children:"ar"===m?"السعر":"Price"}),(0,b.jsx)("th",{className:"text-left py-1",children:"ar"===m?"الإجمالي":"Total"})]})}),(0,b.jsxs)("tbody",{children:[(y[a.id]||[]).map((a,c)=>{let d=a.name_snapshot||("ar"===m?a.name_ar:a.name_en),e=a.unit_price??a.price_snapshot??0,f=a.total_price??Number(a.price_snapshot||0)*Number(a.quantity||0);return(0,b.jsxs)("tr",{children:[(0,b.jsx)("td",{className:"py-1",children:d}),(0,b.jsx)("td",{className:"py-1",children:a.quantity}),(0,b.jsxs)("td",{className:"py-1",children:[Number(e).toFixed(2)," ",n]}),(0,b.jsxs)("td",{className:"py-1",children:[Number(f).toFixed(2)," ",n]})]},a.id||c)}),0===(y[a.id]||[]).length&&(0,b.jsx)("tr",{children:(0,b.jsx)("td",{colSpan:4,className:"py-2 text-slate-500",children:"ar"===m?"لا توجد عناصر":"No items found"})})]})]})})]})})]},a.id))})]})})]})]})]})}function j(){return(0,b.jsx)(c.Suspense,{fallback:(0,b.jsx)("div",{className:"min-h-screen flex items-center justify-center text-gray-400",children:"Loading..."}),children:(0,b.jsx)(i,{})})}a.s(["default",()=>j])}];

//# sourceMappingURL=app_invoices_page_tsx_9c2beab6._.js.map