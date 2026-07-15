/* ============================================================
   FOLIO ERP — data layer
   All data lives in localStorage so the demo runs entirely
   client-side on GitHub Pages, no backend required.
   ============================================================ */

const DB_KEYS = {
  products: 'folioerp_products',
  clients: 'folioerp_clients',
  sales: 'folioerp_sales',
  invoices: 'folioerp_invoices',
  counters: 'folioerp_counters',
  seeded: 'folioerp_seeded_v1'
};

const DB = {
  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){ return fallback; }
  },
  set(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  },
  products(){ return DB.get(DB_KEYS.products, []); },
  clients(){ return DB.get(DB_KEYS.clients, []); },
  sales(){ return DB.get(DB_KEYS.sales, []); },
  invoices(){ return DB.get(DB_KEYS.invoices, []); },
  counters(){ return DB.get(DB_KEYS.counters, {sale: 0, invoice: 0}); },
  saveProducts(v){ DB.set(DB_KEYS.products, v); },
  saveClients(v){ DB.set(DB_KEYS.clients, v); },
  saveSales(v){ DB.set(DB_KEYS.sales, v); },
  saveInvoices(v){ DB.set(DB_KEYS.invoices, v); },
  saveCounters(v){ DB.set(DB_KEYS.counters, v); }
};

function nextFolio(kind){
  const counters = DB.counters();
  const year = new Date().getFullYear();
  counters[kind] = (counters[kind] || 0) + 1;
  DB.saveCounters(counters);
  const prefix = kind === 'sale' ? 'VTA' : 'FAC';
  return `${prefix}-${year}-${String(counters[kind]).padStart(6,'0')}`;
}

function uid(){
  return Math.random().toString(36).slice(2, 10);
}

function fmtMoney(n){
  return new Intl.NumberFormat('es-MX', { style:'currency', currency:'MXN' }).format(n);
}

function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
}

function daysAgo(n){
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n){
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

/* ---------------- Seed data ---------------- */
function seedIfNeeded(force){
  if (!force && DB.get(DB_KEYS.seeded, false)) return;

  const clients = [
    { id: uid(), name: 'Comercializadora del Valle S.A. de C.V.', email: 'compras@delvalle.mx', phone: '55 1234 0098', rfc: 'CDV920314AB1' },
    { id: uid(), name: 'Ferretería La Central', email: 'contacto@lacentral.mx', phone: '55 2244 7710', rfc: 'FLC880102XY4' },
    { id: uid(), name: 'Grupo Nortec Industrial', email: 'admin@nortec.mx', phone: '81 3311 5566', rfc: 'GNI010507QW2' },
    { id: uid(), name: 'Papelería Escolar Aurora', email: 'ventas@auroraescolar.mx', phone: '33 4455 2200', rfc: 'PEA150920KJ8' },
    { id: uid(), name: 'Tecno Import MX', email: 'pedidos@tecnoimport.mx', phone: '55 8899 1002', rfc: 'TIM070611LP6' },
    { id: uid(), name: 'Restaurante Casa Milagro', email: 'gerencia@casamilagro.mx', phone: '55 6677 3345', rfc: 'RCM990423HN3' }
  ];

  const categories = ['Electrónica', 'Oficina', 'Ferretería', 'Insumos'];
  const products = [
    { id: uid(), sku: 'ELE-1001', name: 'Router WiFi 6 Dual Band', category: 'Electrónica', price: 890, stock: 42, minStock: 10 },
    { id: uid(), sku: 'ELE-1002', name: 'Multicontacto regulado 8 salidas', category: 'Electrónica', price: 320, stock: 6, minStock: 15 },
    { id: uid(), sku: 'ELE-1003', name: 'Cable HDMI 2.1 2m', category: 'Electrónica', price: 145, stock: 88, minStock: 20 },
    { id: uid(), sku: 'OFI-2001', name: 'Silla ejecutiva ergonómica', category: 'Oficina', price: 2450, stock: 9, minStock: 5 },
    { id: uid(), sku: 'OFI-2002', name: 'Escritorio modular 120cm', category: 'Oficina', price: 1980, stock: 3, minStock: 4 },
    { id: uid(), sku: 'OFI-2003', name: 'Paquete 500 hojas carta', category: 'Oficina', price: 98, stock: 210, minStock: 40 },
    { id: uid(), sku: 'FER-3001', name: 'Taladro inalámbrico 20V', category: 'Ferretería', price: 1320, stock: 17, minStock: 6 },
    { id: uid(), sku: 'FER-3002', name: 'Juego de llaves allen 9 pzas', category: 'Ferretería', price: 210, stock: 54, minStock: 12 },
    { id: uid(), sku: 'FER-3003', name: 'Cinta métrica 5m', category: 'Ferretería', price: 89, stock: 4, minStock: 15 },
    { id: uid(), sku: 'INS-4001', name: 'Guantes de nitrilo (caja 100)', category: 'Insumos', price: 165, stock: 130, minStock: 25 },
    { id: uid(), sku: 'INS-4002', name: 'Cubrebocas tricapa (caja 50)', category: 'Insumos', price: 95, stock: 60, minStock: 20 },
    { id: uid(), sku: 'INS-4003', name: 'Gel antibacterial 1L', category: 'Insumos', price: 78, stock: 11, minStock: 15 }
  ];

  const sales = [];
  const invoices = [];
  const statusPool = ['pagada','pagada','pendiente','pagada','vencida','pendiente'];

  for (let i = 0; i < 9; i++){
    const client = clients[i % clients.length];
    const itemCount = 1 + Math.floor(Math.random()*3);
    const items = [];
    let total = 0;
    for (let j = 0; j < itemCount; j++){
      const p = products[Math.floor(Math.random()*products.length)];
      const qty = 1 + Math.floor(Math.random()*4);
      const lineTotal = qty * p.price;
      total += lineTotal;
      items.push({ productId: p.id, name: p.name, qty, price: p.price });
    }
    const ago = 8 - Math.floor(i * 0.9);
    const saleId = uid();
    const saleFolio = nextFolio('sale');
    const status = statusPool[i % statusPool.length];
    sales.push({
      id: saleId, folio: saleFolio, clientId: client.id, clientName: client.name,
      date: daysAgo(Math.max(ago,0)), items, total, status
    });

    const invFolio = nextFolio('invoice');
    invoices.push({
      id: uid(), folio: invFolio, saleId, saleFolio, clientId: client.id, clientName: client.name,
      issueDate: daysAgo(Math.max(ago,0)), dueDate: status === 'vencida' ? daysAgo(2) : daysFromNow(15 - i),
      total, status, items
    });
  }

  DB.saveClients(clients);
  DB.saveProducts(products);
  DB.saveSales(sales);
  DB.saveInvoices(invoices);
  DB.set(DB_KEYS.seeded, true);
}

function resetDemoData(){
  localStorage.removeItem(DB_KEYS.products);
  localStorage.removeItem(DB_KEYS.clients);
  localStorage.removeItem(DB_KEYS.sales);
  localStorage.removeItem(DB_KEYS.invoices);
  localStorage.removeItem(DB_KEYS.counters);
  localStorage.removeItem(DB_KEYS.seeded);
  seedIfNeeded(true);
}
