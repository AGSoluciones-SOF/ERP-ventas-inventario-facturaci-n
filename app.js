/* ============================================================
   FOLIO ERP — application logic
   ============================================================ */

seedIfNeeded(false);

const els = {
  nav: document.getElementById('mainNav'),
  viewTitle: document.getElementById('viewTitle'),
  viewSubtitle: document.getElementById('viewSubtitle'),
  todayFolio: document.getElementById('todayFolio'),
  sidebar: document.querySelector('.sidebar'),
  menuToggle: document.getElementById('menuToggle'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalRoot: document.getElementById('modalRoot'),
  toastStack: document.getElementById('toastStack'),
};

const VIEW_META = {
  dashboard: { title: 'Panel general', sub: 'Resumen de la operación de hoy' },
  ventas: { title: 'Ventas', sub: 'Registro y seguimiento de ventas' },
  inventario: { title: 'Inventario', sub: 'Existencias, precios y niveles mínimos' },
  facturacion: { title: 'Facturación', sub: 'Folios fiscales generados a partir de tus ventas' },
  clientes: { title: 'Clientes', sub: 'Directorio y actividad por cliente' },
};

/* ---------------- Router ---------------- */
function router(){
  const hash = (location.hash || '#dashboard').replace('#','');
  const view = VIEW_META[hash] ? hash : 'dashboard';

  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  document.getElementById('view-' + view).hidden = false;

  els.nav.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.view === view);
  });

  els.viewTitle.textContent = VIEW_META[view].title;
  els.viewSubtitle.textContent = VIEW_META[view].sub;
  els.sidebar.classList.remove('open');

  const renderers = { dashboard: renderDashboard, ventas: renderVentas, inventario: renderInventario, facturacion: renderFacturacion, clientes: renderClientes };
  renderers[view]();
}
window.addEventListener('hashchange', router);
els.menuToggle.addEventListener('click', () => els.sidebar.classList.toggle('open'));

/* ---------------- Toasts ---------------- */
function toast(msg, type){
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  t.textContent = msg;
  els.toastStack.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------------- Modal helpers ---------------- */
function openModal(html){
  els.modalRoot.innerHTML = html;
  els.modalOverlay.hidden = false;
}
function closeModal(){
  els.modalOverlay.hidden = true;
  els.modalRoot.innerHTML = '';
}
els.modalOverlay.addEventListener('click', (e) => { if (e.target === els.modalOverlay) closeModal(); });

/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard(){
  const sales = DB.sales();
  const products = DB.products();
  const invoices = DB.invoices();

  els.todayFolio.textContent = nextFolioPreview();

  const last7 = [...Array(7)].map((_, i) => {
    const dayIndex = 6 - i;
    const d = new Date(); d.setDate(d.getDate() - dayIndex); d.setHours(0,0,0,0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const total = sales.filter(s => { const t = new Date(s.date).getTime(); return t >= d.getTime() && t < next.getTime(); })
                        .reduce((a,s) => a + s.total, 0);
    return { label: d.toLocaleDateString('es-MX', { weekday:'short' }).replace('.',''), total };
  });

  const monthTotal = sales.reduce((a,s) => a + s.total, 0);
  const pendingInvoices = invoices.filter(i => i.status === 'pendiente').length;
  const overdueInvoices = invoices.filter(i => i.status === 'vencida').length;
  const lowStock = products.filter(p => p.stock <= p.minStock);

  const kpis = [
    { label: 'Ingresos registrados', value: fmtMoney(monthTotal), delta: `${sales.length} ventas`, deltaClass: 'up',
      icon: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>', color: 'var(--green-soft)', fg: 'var(--green-deep)' },
    { label: 'Facturas pendientes', value: pendingInvoices, delta: overdueInvoices ? `${overdueInvoices} vencidas` : 'al corriente', deltaClass: overdueInvoices ? 'down' : 'flat',
      icon: '<path d="M6 2h9l5 5v15H6Z"/><path d="M15 2v5h5"/>', color: 'var(--brass-soft)', fg: '#7A611A' },
    { label: 'Productos en catálogo', value: products.length, delta: `${lowStock.length} en mínimo`, deltaClass: lowStock.length ? 'down' : 'flat',
      icon: '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/>', color: 'var(--green-soft)', fg: 'var(--green-deep)' },
    { label: 'Clientes activos', value: DB.clients().length, delta: 'directorio', deltaClass: 'flat',
      icon: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6"/>', color: 'var(--brass-soft)', fg: '#7A611A' },
  ];

  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-top">
        <span class="kpi-label">${k.label}</span>
        <span class="kpi-icon" style="background:${k.color}"><svg class="icon" style="stroke:${k.fg}" viewBox="0 0 24 24">${k.icon}</svg></span>
      </div>
      <span class="kpi-value">${k.value}</span>
      <span class="kpi-delta ${k.deltaClass}">${k.delta}</span>
    </div>
  `).join('');

  document.getElementById('salesChart').innerHTML = buildBarChart(last7);

  const lowStockEl = document.getElementById('lowStockList');
  document.getElementById('lowStockCount').textContent = lowStock.length;
  lowStockEl.innerHTML = lowStock.length ? lowStock.map(p => `
    <div class="low-stock-row">
      <span class="dot"></span>
      <span class="name">${p.name}</span>
      <span class="qty">${p.stock} / min ${p.minStock}</span>
    </div>`).join('') : `<p class="empty-note">Todo el inventario está por encima de su mínimo.</p>`;

  const recent = [...sales].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,6);
  document.querySelector('#recentSalesTable tbody').innerHTML = recent.map(s => `
    <tr>
      <td class="mono">${s.folio}</td>
      <td>${s.clientName}</td>
      <td>${fmtDate(s.date)}</td>
      <td>${s.items.length}</td>
      <td class="mono">${fmtMoney(s.total)}</td>
      <td>${statusStamp(s.status)}</td>
    </tr>`).join('') || `<tr><td colspan="6" class="empty-note">Aún no hay ventas registradas.</td></tr>`;
}

function nextFolioPreview(){
  const c = DB.counters();
  const year = new Date().getFullYear();
  return `FAC-${year}-${String((c.invoice||0)+1).padStart(6,'0')}`;
}

function buildBarChart(data){
  const w = 560, h = 220, padB = 30, padT = 20, padL = 10, padR = 10;
  const max = Math.max(1, ...data.map(d => d.total));
  const barW = (w - padL - padR) / data.length * 0.55;
  const gap = (w - padL - padR) / data.length;
  let bars = '', labels = '';
  data.forEach((d, i) => {
    const x = padL + i * gap + (gap - barW)/2;
    const barH = (d.total / max) * (h - padT - padB);
    const y = h - padB - barH;
    bars += `<rect class="chart-bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" rx="3"></rect>`;
    if (d.total > 0) bars += `<text class="chart-value-label" x="${(x+barW/2).toFixed(1)}" y="${(y-6).toFixed(1)}" text-anchor="middle">${Math.round(d.total/1000)}k</text>`;
    labels += `<text class="chart-axis-label" x="${(x+barW/2).toFixed(1)}" y="${h-10}" text-anchor="middle">${d.label}</text>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
    <line x1="${padL}" y1="${h-padB}" x2="${w-padR}" y2="${h-padB}" stroke="var(--border)" stroke-width="1"/>
    ${bars}${labels}
  </svg>`;
}

function statusStamp(status){
  const labelMap = { pagada: 'Pagada', pendiente: 'Pendiente', vencida: 'Vencida' };
  return `<span class="stamp stamp-${status}">${labelMap[status] || status}</span>`;
}

/* ============================================================
   VENTAS
   ============================================================ */
function renderVentas(){
  const list = document.getElementById('ventasTable').querySelector('tbody');
  const draw = () => {
    const q = document.getElementById('ventasSearch').value.trim().toLowerCase();
    const sales = [...DB.sales()].sort((a,b) => new Date(b.date) - new Date(a.date))
      .filter(s => !q || s.folio.toLowerCase().includes(q) || s.clientName.toLowerCase().includes(q));
    list.innerHTML = sales.map(s => `
      <tr>
        <td class="mono">${s.folio}</td>
        <td>${s.clientName}</td>
        <td>${fmtDate(s.date)}</td>
        <td>${s.items.length} artículo${s.items.length===1?'':'s'}</td>
        <td class="mono">${fmtMoney(s.total)}</td>
        <td>${statusStamp(s.status)}</td>
        <td class="row-actions">
          <button class="btn-icon" data-view-sale="${s.id}" title="Ver detalle">
            <svg class="icon" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </td>
      </tr>`).join('') || `<tr><td colspan="7" class="empty-note">No se encontraron ventas con ese criterio.</td></tr>`;

    list.querySelectorAll('[data-view-sale]').forEach(btn => btn.addEventListener('click', () => viewSaleDetail(btn.dataset.viewSale)));
  };
  document.getElementById('ventasSearch').oninput = draw;
  document.getElementById('newSaleBtn').onclick = openNewSaleModal;
  draw();
}

function viewSaleDetail(saleId){
  const sale = DB.sales().find(s => s.id === saleId);
  if (!sale) return;
  const invoice = DB.invoices().find(i => i.saleId === saleId);
  openModal(`
    <h2>Venta ${sale.folio}</h2>
    <p class="modal-sub">${sale.clientName} · ${fmtDate(sale.date)}</p>
    <div class="invoice-doc">
      <table>
        <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th class="text-right">Importe</th></tr></thead>
        <tbody>
          ${sale.items.map(it => `<tr><td>${it.name}</td><td>${it.qty}</td><td class="mono">${fmtMoney(it.price)}</td><td class="mono text-right">${fmtMoney(it.qty*it.price)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="sale-total"><span>Total</span><b>${fmtMoney(sale.total)}</b></div>
    </div>
    <div class="modal-actions">
      ${invoice ? `<button class="btn-secondary" id="goInvoiceBtn">Ver factura ${invoice.folio}</button>` : ''}
      <button class="btn-primary" id="closeSaleModal">Cerrar</button>
    </div>
  `);
  document.getElementById('closeSaleModal').onclick = closeModal;
  if (invoice) document.getElementById('goInvoiceBtn').onclick = () => { closeModal(); location.hash = '#facturacion'; setTimeout(() => viewInvoiceDetail(invoice.id), 50); };
}

function openNewSaleModal(){
  const products = DB.products();
  const clients = DB.clients();
  if (!products.length){ toast('Registra al menos un producto antes de crear una venta.', 'error'); return; }
  if (!clients.length){ toast('Registra al menos un cliente antes de crear una venta.', 'error'); return; }

  openModal(`
    <h2>Nueva venta</h2>
    <p class="modal-sub">Se generará automáticamente una factura y se descontará del inventario.</p>
    <div class="form-row">
      <label for="saleClient">Cliente</label>
      <select id="saleClient">${clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
    </div>
    <div class="form-row">
      <label>Artículos</label>
      <div class="line-items" id="lineItems"></div>
      <button type="button" class="add-line-btn" id="addLineBtn">+ Agregar artículo</button>
    </div>
    <div class="sale-total"><span>Total</span><b id="saleTotalLabel">${fmtMoney(0)}</b></div>
    <div class="modal-actions">
      <button class="btn-secondary" id="cancelSaleBtn">Cancelar</button>
      <button class="btn-primary" id="submitSaleBtn">Registrar venta</button>
    </div>
  `);

  const lineItemsEl = document.getElementById('lineItems');

  function addLine(){
    const row = document.createElement('div');
    row.className = 'line-item-row';
    row.innerHTML = `
      <select class="line-product">${products.map(p => `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">${p.name} (stock ${p.stock})</option>`).join('')}</select>
      <input type="number" class="line-qty" min="1" value="1">
      <span class="mono line-subtotal">${fmtMoney(products[0]?.price || 0)}</span>
      <button type="button" class="remove-line" title="Quitar">✕</button>
    `;
    lineItemsEl.appendChild(row);
    const sel = row.querySelector('.line-product');
    const qty = row.querySelector('.line-qty');
    const sub = row.querySelector('.line-subtotal');
    const recalcRow = () => {
      const opt = sel.selectedOptions[0];
      const price = parseFloat(opt.dataset.price);
      sub.textContent = fmtMoney(price * (parseInt(qty.value)||0));
      recalcTotal();
    };
    sel.addEventListener('change', recalcRow);
    qty.addEventListener('input', recalcRow);
    row.querySelector('.remove-line').addEventListener('click', () => { row.remove(); recalcTotal(); });
    recalcRow();
  }

  function recalcTotal(){
    let total = 0;
    lineItemsEl.querySelectorAll('.line-item-row').forEach(row => {
      const opt = row.querySelector('.line-product').selectedOptions[0];
      const qty = parseInt(row.querySelector('.line-qty').value) || 0;
      total += parseFloat(opt.dataset.price) * qty;
    });
    document.getElementById('saleTotalLabel').textContent = fmtMoney(total);
  }

  addLine();
  document.getElementById('addLineBtn').onclick = addLine;
  document.getElementById('cancelSaleBtn').onclick = closeModal;

  document.getElementById('submitSaleBtn').onclick = () => {
    const rows = [...lineItemsEl.querySelectorAll('.line-item-row')];
    if (!rows.length){ toast('Agrega al menos un artículo.', 'error'); return; }

    const items = [];
    let total = 0;
    const productsLive = DB.products();

    for (const row of rows){
      const opt = row.querySelector('.line-product').selectedOptions[0];
      const productId = opt.value;
      const qty = parseInt(row.querySelector('.line-qty').value) || 0;
      const product = productsLive.find(p => p.id === productId);
      if (!product){ continue; }
      if (qty <= 0){ toast('La cantidad debe ser mayor a cero.', 'error'); return; }
      if (qty > product.stock){ toast(`No hay stock suficiente de "${product.name}" (disponible: ${product.stock}).`, 'error'); return; }
      items.push({ productId, name: product.name, qty, price: product.price });
      total += qty * product.price;
    }
    if (!items.length){ toast('Agrega al menos un artículo válido.', 'error'); return; }

    const client = clients.find(c => c.id === document.getElementById('saleClient').value);

    // Deduct stock
    const updatedProducts = productsLive.map(p => {
      const line = items.find(it => it.productId === p.id);
      return line ? { ...p, stock: p.stock - line.qty } : p;
    });
    DB.saveProducts(updatedProducts);

    const sale = { id: uid(), folio: nextFolio('sale'), clientId: client.id, clientName: client.name, date: new Date().toISOString(), items, total, status: 'pagada' };
    const sales = DB.sales(); sales.unshift(sale); DB.saveSales(sales);

    const invoice = { id: uid(), folio: nextFolio('invoice'), saleId: sale.id, saleFolio: sale.folio, clientId: client.id, clientName: client.name, issueDate: sale.date, dueDate: daysFromNow(15), total, status: 'pendiente', items };
    const invoices = DB.invoices(); invoices.unshift(invoice); DB.saveInvoices(invoices);

    closeModal();
    toast(`Venta ${sale.folio} registrada y factura ${invoice.folio} generada.`);
    renderVentas();
  };
}

/* ============================================================
   INVENTARIO
   ============================================================ */
function renderInventario(){
  const catFilter = document.getElementById('invCategoryFilter');
  const categories = [...new Set(DB.products().map(p => p.category))];
  catFilter.innerHTML = `<option value="">Todas las categorías</option>` + categories.map(c => `<option value="${c}">${c}</option>`).join('');

  const tbody = document.getElementById('invTable').querySelector('tbody');
  const draw = () => {
    const q = document.getElementById('invSearch').value.trim().toLowerCase();
    const cat = catFilter.value;
    const products = DB.products().filter(p =>
      (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
      (!cat || p.category === cat)
    );
    tbody.innerHTML = products.map(p => {
      const low = p.stock <= p.minStock;
      return `
      <tr>
        <td class="mono">${p.sku}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td class="mono">${fmtMoney(p.price)}</td>
        <td class="mono">${p.stock}</td>
        <td class="mono text-muted">${p.minStock}</td>
        <td>${low ? '<span class="stamp stamp-vencida">Bajo mínimo</span>' : '<span class="stamp stamp-pagada">OK</span>'}</td>
        <td class="row-actions">
          <button class="btn-icon" data-edit="${p.id}" title="Editar">
            <svg class="icon" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <button class="btn-icon" data-delete="${p.id}" title="Eliminar">
            <svg class="icon" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </td>
      </tr>`;
    }).join('') || `<tr><td colspan="8" class="empty-note">No se encontraron productos con ese criterio.</td></tr>`;

    tbody.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openProductModal(btn.dataset.edit)));
    tbody.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteProduct(btn.dataset.delete)));
  };
  document.getElementById('invSearch').oninput = draw;
  catFilter.onchange = draw;
  document.getElementById('newProductBtn').onclick = () => openProductModal(null);
  draw();
}

function deleteProduct(id){
  const product = DB.products().find(p => p.id === id);
  if (!product) return;
  openModal(`
    <h2>Eliminar producto</h2>
    <p class="modal-sub">¿Eliminar "${product.name}" del catálogo? Esta acción no se puede deshacer.</p>
    <div class="modal-actions">
      <button class="btn-secondary" id="cancelDel">Cancelar</button>
      <button class="btn-primary" style="background:var(--brick)" id="confirmDel">Eliminar</button>
    </div>
  `);
  document.getElementById('cancelDel').onclick = closeModal;
  document.getElementById('confirmDel').onclick = () => {
    DB.saveProducts(DB.products().filter(p => p.id !== id));
    closeModal();
    toast(`"${product.name}" se eliminó del catálogo.`);
    renderInventario();
  };
}

function openProductModal(productId){
  const editing = !!productId;
  const product = editing ? DB.products().find(p => p.id === productId) : null;
  openModal(`
    <h2>${editing ? 'Editar producto' : 'Nuevo producto'}</h2>
    <p class="modal-sub">${editing ? 'Actualiza los datos del producto.' : 'Agrega un producto al catálogo de inventario.'}</p>
    <div class="form-grid2">
      <div class="form-row"><label>SKU</label><input id="pSku" value="${product?.sku || ''}" placeholder="OFI-2004"></div>
      <div class="form-row"><label>Categoría</label><input id="pCategory" value="${product?.category || ''}" placeholder="Oficina"></div>
    </div>
    <div class="form-row"><label>Nombre del producto</label><input id="pName" value="${product?.name || ''}" placeholder="Silla ejecutiva"></div>
    <div class="form-grid2">
      <div class="form-row"><label>Precio (MXN)</label><input id="pPrice" type="number" min="0" step="0.01" value="${product?.price ?? ''}"></div>
      <div class="form-row"><label>Existencia actual</label><input id="pStock" type="number" min="0" value="${product?.stock ?? ''}"></div>
    </div>
    <div class="form-row"><label>Existencia mínima</label><input id="pMinStock" type="number" min="0" value="${product?.minStock ?? 5}"></div>
    <div class="modal-actions">
      <button class="btn-secondary" id="cancelProd">Cancelar</button>
      <button class="btn-primary" id="saveProd">${editing ? 'Guardar cambios' : 'Agregar producto'}</button>
    </div>
  `);
  document.getElementById('cancelProd').onclick = closeModal;
  document.getElementById('saveProd').onclick = () => {
    const sku = document.getElementById('pSku').value.trim();
    const category = document.getElementById('pCategory').value.trim();
    const name = document.getElementById('pName').value.trim();
    const price = parseFloat(document.getElementById('pPrice').value);
    const stock = parseInt(document.getElementById('pStock').value);
    const minStock = parseInt(document.getElementById('pMinStock').value);

    if (!sku || !category || !name || isNaN(price) || isNaN(stock) || isNaN(minStock)){
      toast('Completa todos los campos correctamente.', 'error'); return;
    }

    const products = DB.products();
    if (editing){
      const idx = products.findIndex(p => p.id === productId);
      products[idx] = { ...products[idx], sku, category, name, price, stock, minStock };
    } else {
      products.unshift({ id: uid(), sku, category, name, price, stock, minStock });
    }
    DB.saveProducts(products);
    closeModal();
    toast(editing ? `"${name}" se actualizó correctamente.` : `"${name}" se agregó al catálogo.`);
    renderInventario();
  };
}

/* ============================================================
   FACTURACION
   ============================================================ */
function renderFacturacion(){
  const tbody = document.getElementById('facTable').querySelector('tbody');
  const draw = () => {
    const q = document.getElementById('facSearch').value.trim().toLowerCase();
    const statusF = document.getElementById('facStatusFilter').value;
    const invoices = [...DB.invoices()].sort((a,b) => new Date(b.issueDate) - new Date(a.issueDate))
      .filter(i => (!q || i.folio.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q)) && (!statusF || i.status === statusF));

    tbody.innerHTML = invoices.map(i => `
      <tr>
        <td class="mono">${i.folio}</td>
        <td>${i.clientName}</td>
        <td>${fmtDate(i.issueDate)}</td>
        <td>${fmtDate(i.dueDate)}</td>
        <td class="mono">${fmtMoney(i.total)}</td>
        <td>${statusStamp(i.status)}</td>
        <td class="row-actions">
          <button class="btn-icon" data-view-inv="${i.id}" title="Ver factura">
            <svg class="icon" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </td>
      </tr>`).join('') || `<tr><td colspan="7" class="empty-note">No se encontraron facturas con ese criterio.</td></tr>`;

    tbody.querySelectorAll('[data-view-inv]').forEach(btn => btn.addEventListener('click', () => viewInvoiceDetail(btn.dataset.viewInv)));
  };
  document.getElementById('facSearch').oninput = draw;
  document.getElementById('facStatusFilter').onchange = draw;
  draw();
}

function viewInvoiceDetail(invoiceId){
  const invoice = DB.invoices().find(i => i.id === invoiceId);
  if (!invoice) return;
  const client = DB.clients().find(c => c.id === invoice.clientId);

  openModal(`
    <h2>Factura ${invoice.folio}</h2>
    <p class="modal-sub">Generada de la venta ${invoice.saleFolio}</p>
    <div class="invoice-doc">
      <div class="invoice-doc-head">
        <div>
          <h3>${invoice.folio}</h3>
          <p class="text-muted" style="font-size:12px;margin:4px 0 0;">Emisión: ${fmtDate(invoice.issueDate)} · Vence: ${fmtDate(invoice.dueDate)}</p>
        </div>
        ${statusStamp(invoice.status)}
      </div>
      <p style="font-size:13px;margin:0 0 4px;"><strong>Cliente:</strong> ${invoice.clientName}</p>
      ${client?.rfc ? `<p style="font-size:12px;margin:0;color:var(--text-muted);">RFC: ${client.rfc}</p>` : ''}
      <table>
        <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th class="text-right">Importe</th></tr></thead>
        <tbody>
          ${invoice.items.map(it => `<tr><td>${it.name}</td><td>${it.qty}</td><td class="mono">${fmtMoney(it.price)}</td><td class="mono text-right">${fmtMoney(it.qty*it.price)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="sale-total"><span>Total</span><b>${fmtMoney(invoice.total)}</b></div>
    </div>
    <div class="form-row" style="margin-top:16px;">
      <label>Actualizar estado</label>
      <select id="invStatusSelect">
        <option value="pendiente" ${invoice.status==='pendiente'?'selected':''}>Pendiente</option>
        <option value="pagada" ${invoice.status==='pagada'?'selected':''}>Pagada</option>
        <option value="vencida" ${invoice.status==='vencida'?'selected':''}>Vencida</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn-secondary" id="printInvBtn">Imprimir / Guardar PDF</button>
      <button class="btn-primary" id="saveInvStatus">Guardar estado</button>
    </div>
  `);

  document.getElementById('saveInvStatus').onclick = () => {
    const status = document.getElementById('invStatusSelect').value;
    const invoices = DB.invoices();
    const idx = invoices.findIndex(i => i.id === invoiceId);
    invoices[idx] = { ...invoices[idx], status };
    DB.saveInvoices(invoices);

    // keep the linked sale status in sync for a coherent record
    const sales = DB.sales();
    const sIdx = sales.findIndex(s => s.id === invoices[idx].saleId);
    if (sIdx > -1){ sales[sIdx] = { ...sales[sIdx], status }; DB.saveSales(sales); }

    closeModal();
    toast(`Factura ${invoices[idx].folio} actualizada a "${status}".`);
    renderFacturacion();
  };
  document.getElementById('printInvBtn').onclick = () => window.print();
}

/* ============================================================
   CLIENTES
   ============================================================ */
function renderClientes(){
  const grid = document.getElementById('clientCards');
  const draw = () => {
    const q = document.getElementById('cliSearch').value.trim().toLowerCase();
    const clients = DB.clients().filter(c => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    const sales = DB.sales();

    grid.innerHTML = clients.map(c => {
      const clientSales = sales.filter(s => s.clientId === c.id);
      const spent = clientSales.reduce((a,s) => a + s.total, 0);
      const initials = c.name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
      return `
      <div class="client-card">
        <div class="ch">
          <div class="client-avatar">${initials}</div>
          <div>
            <div class="client-name">${c.name}</div>
            <div class="client-meta">${c.email}</div>
          </div>
        </div>
        <div class="client-meta">${c.phone} ${c.rfc ? '· RFC ' + c.rfc : ''}</div>
        <div class="client-stats">
          <div><b>${clientSales.length}</b>compras</div>
          <div><b>${fmtMoney(spent)}</b>total</div>
        </div>
      </div>`;
    }).join('') || `<p class="empty-note">No se encontraron clientes con ese criterio.</p>`;
  };
  document.getElementById('cliSearch').oninput = draw;
  document.getElementById('newClientBtn').onclick = openNewClientModal;
  draw();
}

function openNewClientModal(){
  openModal(`
    <h2>Nuevo cliente</h2>
    <p class="modal-sub">Agrega un cliente al directorio.</p>
    <div class="form-row"><label>Nombre o razón social</label><input id="cName" placeholder="Comercializadora Ejemplo S.A. de C.V."></div>
    <div class="form-grid2">
      <div class="form-row"><label>Correo</label><input id="cEmail" type="email" placeholder="contacto@ejemplo.mx"></div>
      <div class="form-row"><label>Teléfono</label><input id="cPhone" placeholder="55 0000 0000"></div>
    </div>
    <div class="form-row"><label>RFC (opcional)</label><input id="cRfc" placeholder="XAXX010101000"></div>
    <div class="modal-actions">
      <button class="btn-secondary" id="cancelCli">Cancelar</button>
      <button class="btn-primary" id="saveCli">Agregar cliente</button>
    </div>
  `);
  document.getElementById('cancelCli').onclick = closeModal;
  document.getElementById('saveCli').onclick = () => {
    const name = document.getElementById('cName').value.trim();
    const email = document.getElementById('cEmail').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const rfc = document.getElementById('cRfc').value.trim();
    if (!name || !email){ toast('El nombre y el correo son obligatorios.', 'error'); return; }
    const clients = DB.clients();
    clients.unshift({ id: uid(), name, email, phone, rfc });
    DB.saveClients(clients);
    closeModal();
    toast(`"${name}" se agregó al directorio.`);
    renderClientes();
  };
}

/* ---------------- Global actions ---------------- */
document.getElementById('resetDemoBtn').addEventListener('click', () => {
  openModal(`
    <h2>Restablecer datos de demostración</h2>
    <p class="modal-sub">Esto borrará los cambios guardados en este navegador y regresará el catálogo, clientes, ventas y facturas a sus valores de ejemplo.</p>
    <div class="modal-actions">
      <button class="btn-secondary" id="cancelReset">Cancelar</button>
      <button class="btn-primary" id="confirmReset">Restablecer</button>
    </div>
  `);
  document.getElementById('cancelReset').onclick = closeModal;
  document.getElementById('confirmReset').onclick = () => {
    resetDemoData();
    closeModal();
    toast('Los datos de demostración se restablecieron.');
    router();
  };
});

/* ---------------- Init ---------------- */
router();
