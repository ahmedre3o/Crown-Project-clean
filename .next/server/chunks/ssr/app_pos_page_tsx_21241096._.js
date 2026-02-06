module.exports=[98704,a=>{"use strict";var b=a.i(87924),c=a.i(72131),d=a.i(70106);let e=(0,d.default)("Printer",[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]]);var f=a.i(38784);let g=(0,d.default)("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);var h=a.i(33508),i=a.i(38632),j=a.i(27452),k=a.i(47036),l=a.i(66392),m=a.i(14942),n=a.i(37087);function o(){let{t:a,language:d,direction:o}=(0,j.useLanguage)(),{user:p}=(0,k.useAuth)(),{symbol:q}=(0,l.useCurrency)(),[r,s]=(0,c.useState)([]),[t,u]=(0,c.useState)([]),[v,w]=(0,c.useState)("all"),[x,y]=(0,c.useState)([]),[z,A]=(0,c.useState)(!1),[B,C]=(0,c.useState)(""),[D,E]=(0,c.useState)(!1),[F,G]=(0,c.useState)(null),[H,I]=(0,c.useState)({name:"",phone:"",address:""}),[J,K]=(0,c.useState)(null),L=(0,c.useRef)(null),M=(0,c.useRef)(()=>{});(0,c.useRef)({buffer:"",lastTs:0,scanning:!1,target:null,targetValue:null}),(0,c.useEffect)(()=>{N(),O(),P()},[]),(0,c.useEffect)(()=>{},[]),(0,c.useEffect)(()=>{},[D]);let N=async()=>{try{let a=await (0,k.apiRequest)("/categories");s(a)}catch(a){console.error("Failed to load categories:",a)}},O=async()=>{try{let a=await (0,k.apiRequest)("/products");u(a),console.log("POS Products Loaded:",Array.isArray(a)?a.length:0)}catch(a){console.error("Failed to load products:",a)}},P=async()=>{try{let a=await (0,k.apiRequest)("/shops/profile");K(a)}catch(a){}},Q=t.filter(a=>"all"===v||("uncategorized"===v?!a.category_id:!v||a.category_id===v)),R=r.filter(a=>t.some(b=>b.category_id===a.id)),S=t.some(a=>!a.category_id),T=a=>{0>=Number(a.available_stock??a.stock_quantity??0)||y(b=>{let c=b.find(b=>b.productId===a.id);if(c){let d=Number(a.available_stock??a.stock_quantity??0);if(c.quantity>=d)return b;let e=Math.min(c.quantity+1,d);return b.map(b=>b.productId===a.id?{...b,quantity:e,total:e*Number(b.price||0)}:b)}return[...b,{productId:a.id,name:"ar"===d?a.name_ar:a.name_en,price:Number(a.sell_price||0),quantity:1,total:Number(a.sell_price||0)}]})},U=a=>{(async()=>{let b=String(a||"").trim();if(!b)return;C(b);let c=t.find(a=>a.barcode===b||a.sku===b||a.qr_code===b);if(!c)try{let a=await (0,k.apiRequest)(`/products/lookup?code=${encodeURIComponent(b)}`);a?.id&&(c=a,u(a=>a.some(a=>a.id===c.id)?a.map(a=>a.id===c.id?c:a):[c,...a]))}catch{}c?(T(c),G("ar"===d?"تمت إضافة المنتج":"Product added to cart.")):G("ar"===d?"لم يتم العثور على المنتج":"Product not found."),C(""),L.current?.focus()})()};(0,c.useEffect)(()=>{M.current=U},[U]),(0,c.useEffect)(()=>{},[]);let V=(a,b)=>{y(c=>{let d=c.find(b=>b.productId===a);if(!d)return c;let e=t.find(b=>b.id===a);if(!e)return c;let f=d.quantity+b;return f<=0?c.filter(b=>b.productId!==a):f>(e.available_stock??e.stock_quantity)?c:c.map(b=>b.productId===a?{...b,quantity:f,total:f*b.price}:b)})},W=()=>{y([])},X=x.reduce((a,b)=>a+Number(b.total||0),0),Y=async()=>{if(0!==x.length)try{let a=x.map(a=>({productId:a.productId,quantity:a.quantity,unitPrice:a.price})),b=await (0,k.apiRequest)("/invoices",{method:"POST",body:JSON.stringify({items:a,paymentMethod:"invoice",customerName:H.name,customerPhone:H.phone,customerAddress:H.address})}),c=0;try{let a=await (0,k.apiRequest)(`/invoices/${b.saleId}/print`,{method:"POST"});c=Number(a?.printCount||0)}catch{}$(b,c),W(),I({name:"",phone:"",address:""}),O()}catch(a){console.error("Invoice print failed:",a),alert("ar"===d?"فشلت العملية":"Payment failed")}},Z=async()=>{if(0!==x.length)try{let a=x.map(a=>({productId:a.productId,quantity:a.quantity,unitPrice:a.price})),b=await (0,k.apiRequest)("/invoices",{method:"POST",body:JSON.stringify({items:a,paymentMethod:"cash",customerName:H.name,customerPhone:H.phone,customerAddress:H.address})}),c=0;try{let a=await (0,k.apiRequest)(`/invoices/${b.saleId}/print`,{method:"POST"});c=Number(a?.printCount||0)}catch{}$(b,c),W(),I({name:"",phone:"",address:""}),O()}catch(a){console.error("Payment failed:",a),alert("ar"===d?"فشلت العملية":"Payment failed")}},$=(a,b)=>{A(!0);let c=window.open("","_blank");if(!c)return void A(!1);let e=b&&b>1?`Duplicate Copy No. ${Math.max(1,b-1)}`:"",f=`
      <!DOCTYPE html>
      <html dir="${"ar"===d?"rtl":"ltr"}" lang="${d}">
        <head>
          <meta charset="UTF-8">
          <title>Receipt - ${a.invoiceNumber||a.saleId}</title>
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
            .items {
              margin-bottom: 25px;
            }
            .item {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }
            .item-name {
              flex: 1;
              color: #111827;
            }
            .item-qty {
              margin: 0 15px;
              color: #6b7280;
            }
            .item-price {
              color: #111827;
              font-weight: 700;
            }
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
              .receipt {
                max-width: 80mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="content">
              <div class="header">
                ${J?.logo_url?`<img src="${J.logo_url}" alt="Logo" style="height: 48px; margin-bottom: 8px;" />`:""}
                <h1>${J?.business_name||"Crown Services"}</h1>
                <p>${J?.activity_type||("ar"===d?"تاج الخدمات":"Services ERP")}</p>
                ${e?`<div class="copy-label">${e}</div>`:""}
              </div>
              <div class="info">
                <p>Invoice # / رقم الفاتورة: ${a.invoiceNumber||a.saleId}</p>
                <p>Date / التاريخ: ${new Date().toLocaleString("ar"===d?"ar-SA":"en-US")}</p>
                <p>Cashier / الكاشير: ${p?.username||"N/A"}</p>
                <p>Customer / العميل: ${H.name||"-"}</p>
                ${J?.address?`<p>Address / العنوان: ${J.address}</p>`:""}
                ${J?.contact_phone?`<p>Phone / الهاتف: ${J.contact_phone}</p>`:""}
              </div>
              <div class="items">
                <div class="item" style="font-weight: 700;">
                  <span class="item-name">Item / الصنف</span>
                  <span class="item-qty">Qty / الكمية</span>
                  <span class="item-price">Price / السعر</span>
                </div>
                ${x.map(a=>`
                  <div class="item">
                    <span class="item-name">${a.name}</span>
                    <span class="item-qty">${a.quantity}x</span>
                    <span class="item-price">${a.total.toFixed(2)} ${q}</span>
                  </div>
                `).join("")}
              </div>
            <div class="total">
              <span>Total / الإجمالي</span>
              <span>${X.toFixed(2)} ${q}</span>
            </div>
            </div>
            <div class="footer">
              <p>Thank you for your visit! / شكراً لزيارتكم!</p>
              <p>Powered by Crown Services | www.crowncs.org</p>
            </div>
          </div>
        </body>
      </html>
    `;c.document.write(f),c.document.close(),setTimeout(()=>{c.print(),A(!1)},500)};return(0,b.jsxs)("div",{className:"min-h-screen bg-black text-white flex",dir:o,children:[(0,b.jsx)(m.Sidebar,{}),(0,b.jsxs)("div",{className:"flex-1 p-8 pt-20 md:pt-8 overflow-y-auto",children:[(0,b.jsx)("div",{className:"flex items-center justify-between mb-6",children:(0,b.jsx)("h1",{className:"text-2xl font-bold text-cyan-200",children:a("pos.title")})}),(0,b.jsxs)("div",{className:"grid grid-cols-1 lg:grid-cols-3 gap-6",children:[(0,b.jsxs)("div",{className:"lg:col-span-2 space-y-6",children:[(0,b.jsxs)("div",{className:"neon-box rounded-xl p-4",children:[(0,b.jsxs)("div",{className:"flex flex-wrap items-center gap-3",children:[(0,b.jsx)("input",{ref:L,value:B,onChange:a=>C(a.target.value),onKeyDown:a=>{"Enter"===a.key&&B.trim()&&(U(B.trim()),C(""))},placeholder:"ar"===d?"امسح الباركود أو اكتب الكود":"Scan or type barcode/SKU",className:"flex-1 bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm"}),(0,b.jsx)("button",{onClick:()=>E(!0),className:"px-4 py-2 rounded-lg border border-cyan-500/40 text-cyan-300 text-sm",children:"ar"===d?"مسح بالكاميرا":"Scan with camera"})]}),F&&(0,b.jsx)("div",{className:"mt-2 text-xs text-slate-400",children:F})]}),(0,b.jsxs)("div",{className:"neon-box rounded-xl p-4",children:[(0,b.jsx)("h2",{className:"text-xl font-bold mb-4 text-cyan-400",children:a("pos.categories")}),(0,b.jsxs)("div",{className:"flex flex-wrap gap-2",children:[(0,b.jsx)("button",{onClick:()=>w("all"),className:`px-4 py-2 rounded-lg transition ${"all"===v?"bg-cyan-600 text-white":"bg-gray-800 text-gray-300 hover:bg-gray-700"}`,children:"ar"===d?"الكل":"All"}),R.map(a=>(0,b.jsx)("button",{onClick:()=>w(a.id),className:`px-4 py-2 rounded-lg transition ${v===a.id?"bg-cyan-600 text-white":"bg-gray-800 text-gray-300 hover:bg-gray-700"}`,children:"ar"===d?a.name_ar:a.name_en},a.id)),S&&(0,b.jsx)("button",{onClick:()=>w("uncategorized"),className:`px-4 py-2 rounded-lg transition ${"uncategorized"===v?"bg-cyan-600 text-white":"bg-gray-800 text-gray-300 hover:bg-gray-700"}`,children:"ar"===d?"غير مصنف":"Uncategorized"})]})]}),(0,b.jsxs)("div",{className:"neon-box rounded-xl p-4",children:[(0,b.jsx)("h2",{className:"text-xl font-bold mb-4 text-cyan-400",children:a("pos.products")}),(0,b.jsx)("div",{className:"grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto",children:Q.map(c=>(0,b.jsxs)("button",{onClick:()=>T(c),disabled:(c.available_stock??c.stock_quantity)<=0,className:"p-4 bg-[#0d1422] rounded-xl hover:bg-[#111a2b] transition text-right disabled:opacity-50 disabled:cursor-not-allowed border border-cyan-500/20 hover:border-cyan-400/50",children:[(0,b.jsx)("div",{className:"h-20 w-full rounded-lg border border-cyan-500/30 bg-black/60 flex items-center justify-center mb-3",children:c.image_url?(0,b.jsx)("img",{src:c.image_url,alt:c.name_ar,className:"h-16 object-contain"}):(0,b.jsx)(i.Image,{className:"h-6 w-6 text-cyan-400/60"})}),(0,b.jsxs)("h3",{className:"font-bold text-white mb-1 flex items-center gap-2",children:[c.image_url?(0,b.jsx)("img",{src:c.image_url,alt:c.name_ar,className:"h-8 w-8 rounded-md object-cover border border-cyan-500/20"}):(0,b.jsx)("span",{className:"h-8 w-8 rounded-md border border-cyan-500/20 flex items-center justify-center text-cyan-300/60",children:(0,b.jsx)(i.Image,{className:"h-4 w-4"})}),(0,b.jsx)("span",{children:"ar"===d?c.name_ar:c.name_en})]}),(0,b.jsx)("p",{className:"text-sm text-gray-400 mb-2",children:c.brand}),(0,b.jsxs)("div",{className:"flex justify-between items-center",children:[(0,b.jsxs)("span",{className:"text-cyan-400 font-bold",children:[Number(c.sell_price||0).toFixed(2)," ",q]}),(0,b.jsxs)("span",{className:`text-xs ${(c.available_stock??c.stock_quantity)>0?"text-green-400":"text-red-400"}`,children:[c.available_stock??c.stock_quantity," ",a("pos.inStock")]})]})]},c.id))})]})]}),(0,b.jsx)("div",{className:"lg:col-span-1",children:(0,b.jsxs)("div",{className:"neon-card rounded-xl p-6 sticky top-6",children:[(0,b.jsxs)("div",{className:"flex items-center justify-between mb-4",children:[(0,b.jsxs)("h2",{className:"text-xl font-bold text-cyan-400 flex items-center gap-2",children:[(0,b.jsx)(f.ShoppingCart,{className:"w-5 h-5"}),a("pos.cart")]}),x.length>0&&(0,b.jsx)("button",{onClick:W,className:"text-red-400 hover:text-red-300",children:(0,b.jsx)(g,{className:"w-5 h-5"})})]}),(0,b.jsx)("div",{className:"space-y-3 mb-6 max-h-[400px] overflow-y-auto",children:0===x.length?(0,b.jsx)("p",{className:"text-gray-500 text-center py-8",children:a("pos.cartEmpty")}):x.map(a=>(0,b.jsxs)("div",{className:"bg-gray-800 p-3 rounded-lg",children:[(0,b.jsxs)("div",{className:"flex justify-between items-start mb-2",children:[(0,b.jsx)("h4",{className:"font-medium text-white flex-1",children:a.name}),(0,b.jsx)("button",{onClick:()=>{var b;return b=a.productId,void y(a=>a.filter(a=>a.productId!==b))},className:"text-red-400 hover:text-red-300 ml-2",children:(0,b.jsx)(h.X,{className:"w-4 h-4"})})]}),(0,b.jsxs)("div",{className:"flex justify-between items-center",children:[(0,b.jsxs)("div",{className:"flex items-center gap-2",children:[(0,b.jsx)("button",{onClick:()=>V(a.productId,-1),className:"w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-sm",children:"-"}),(0,b.jsx)("span",{className:"text-white font-medium",children:a.quantity}),(0,b.jsx)("button",{onClick:()=>V(a.productId,1),className:"w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-sm",children:"+"})]}),(0,b.jsxs)("span",{className:"text-cyan-400 font-bold",children:[Number(a.total||0).toFixed(2)," ",q]})]})]},a.productId))}),(0,b.jsxs)("div",{className:"border-t border-gray-700 pt-4 mb-4",children:[(0,b.jsxs)("div",{className:"space-y-2 mb-4",children:[(0,b.jsx)("input",{className:"w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",placeholder:"ar"===d?"اسم العميل":"Customer name",value:H.name,onChange:a=>I(b=>({...b,name:a.target.value}))}),(0,b.jsx)("input",{className:"w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",placeholder:"ar"===d?"هاتف العميل":"Customer phone",value:H.phone,onChange:a=>I(b=>({...b,phone:a.target.value}))}),(0,b.jsx)("input",{className:"w-full bg-[#0f172a] border border-cyan-500/20 rounded-lg px-3 py-2 text-sm",placeholder:"ar"===d?"عنوان العميل":"Customer address",value:H.address,onChange:a=>I(b=>({...b,address:a.target.value}))})]}),(0,b.jsxs)("div",{className:"flex justify-between items-center mb-4",children:[(0,b.jsxs)("span",{className:"text-lg font-bold",children:[a("pos.total"),":"]}),(0,b.jsxs)("span",{className:"text-2xl font-bold text-cyan-400",children:[X.toFixed(2)," ",q]})]})]}),(0,b.jsxs)("button",{onClick:Y,disabled:0===x.length||z,className:"w-full mb-3 bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base",style:{boxShadow:"0 0 18px rgba(236,72,153,0.35)"},children:["🧾 ",a("pos.printInvoice")]}),(0,b.jsx)("button",{onClick:Z,disabled:0===x.length||z,className:"w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg",style:{boxShadow:"0 0 20px rgba(0, 243, 255, 0.5)"},children:z?(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(e,{className:"w-5 h-5 animate-pulse"}),a("pos.printing")]}):(0,b.jsxs)(b.Fragment,{children:["💵 ",a("pos.cash")]})})]})})]})]}),(0,b.jsx)(n.BarcodeScanner,{open:D,onClose:()=>E(!1),onDetected:U,onError:a=>{G("ar"===d?"الكاميرا مش مدعومة هنا — استخدم جهاز الباركود أو اكتب الكود.":a||"Camera scan unavailable — use a scanner gun or type the code."),E(!1),L.current?.focus()}})]})}a.s(["default",()=>o],98704)}];

//# sourceMappingURL=app_pos_page_tsx_21241096._.js.map