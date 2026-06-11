const API = '/api';
const peso = (n) =>
  '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const state = { expenses: [], categories: [], sort: { key: 'date', dir: 'asc' } };
const charts = {};

// If the session expires, the API returns 401 and we bounce back to login.
async function api(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  return res;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
async function fetchExpenses() {
  const params = new URLSearchParams();
  const q = document.getElementById('search').value.trim();
  const category = document.getElementById('filterCategory').value;
  const payer = document.getElementById('filterPayer').value;
  const status = document.getElementById('filterStatus').value;
  const year = document.getElementById('filterYear').value;
  const scope = document.getElementById('scope').value;
  if (q) params.set('q', q);
  if (category) params.set('category', category);
  if (payer) params.set('payer', payer);
  if (status) params.set('status', status);
  if (year) params.set('year', year);
  if (scope && scope !== 'all') params.set('scope', scope);

  const res = await api(`${API}/expenses?${params}`);
  state.expenses = await res.json();
  renderTable();
}

async function fetchStats() {
  const scope = document.getElementById('scope').value;
  const params = new URLSearchParams();
  if (scope && scope !== 'all') params.set('scope', scope);
  const res = await api(`${API}/stats?${params}`);
  const stats = await res.json();
  renderCards(stats);
  renderCharts(stats);
}

// ---------------------------------------------------------------------------
// Summary cards
// ---------------------------------------------------------------------------
function renderCards({ totals }) {
  const obligated = totals.paid + totals.unpaid;
  const pct = obligated ? Math.round((totals.paid / obligated) * 100) : 0;
  document.getElementById('cards').innerHTML = `
    <div class="card">
      <div class="label">Total Budget</div>
      <div class="value">${peso(totals.total)}</div>
      <div class="sub">${totals.count} records</div>
    </div>
    <div class="card paid">
      <div class="label">Paid</div>
      <div class="value">${peso(totals.paid)}</div>
      <div class="sub">${pct}% of dues</div>
    </div>
    <div class="card unpaid">
      <div class="label">Outstanding</div>
      <div class="value">${peso(totals.unpaid)}</div>
      <div class="sub">Unpaid dues</div>
    </div>
    <div class="card planned">
      <div class="label">Planned (Wedding)</div>
      <div class="value">${peso(totals.planned)}</div>
      <div class="sub">Estimated, not yet due</div>
    </div>
    <div class="card">
      <div class="label">Payment Progress</div>
      <div class="value">${pct}%</div>
      <div class="sub">Paid vs total dues</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
const PALETTE = ['#4f46e5', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#db2777', '#0d9488'];

function makeChart(id, config) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(document.getElementById(id), config);
}

function renderCharts({ byCategory, byStatus, byPayer, monthly }) {
  // Monthly line chart (cumulative paid + per-month total)
  let cumulative = 0;
  const cumdata = monthly.map((m) => (cumulative += m.paid));
  makeChart('monthlyChart', {
    type: 'line',
    data: {
      labels: monthly.map((m) => m.month),
      datasets: [
        {
          label: 'Paid (per month)',
          data: monthly.map((m) => m.paid),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,0.12)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Cumulative Paid',
          data: cumdata,
          borderColor: '#4f46e5',
          backgroundColor: 'transparent',
          tension: 0.3,
          yAxisID: 'y1',
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { ticks: { callback: (v) => '₱' + v.toLocaleString() } },
        y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (v) => '₱' + (v / 1000) + 'k' } },
      },
    },
  });

  // Category bar (paid vs unpaid stacked)
  makeChart('categoryChart', {
    type: 'bar',
    data: {
      labels: byCategory.map((c) => c.category),
      datasets: [
        { label: 'Paid', data: byCategory.map((c) => c.paid), backgroundColor: '#16a34a' },
        { label: 'Unpaid', data: byCategory.map((c) => c.unpaid), backgroundColor: '#e2e8f0' },
        { label: 'Planned', data: byCategory.map((c) => c.planned), backgroundColor: '#d97706' },
      ],
    },
    options: {
      responsive: true,
      scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (v) => '₱' + (v / 1000) + 'k' } } },
    },
  });

  // Status doughnut
  const statusColor = { Paid: '#16a34a', Unpaid: '#dc2626', Planned: '#d97706' };
  makeChart('statusChart', {
    type: 'doughnut',
    data: {
      labels: byStatus.map((s) => s.status),
      datasets: [
        {
          data: byStatus.map((s) => s.total),
          backgroundColor: byStatus.map((s) => statusColor[s.status] || '#94a3b8'),
        },
      ],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  });

  // Payer doughnut
  makeChart('payerChart', {
    type: 'doughnut',
    data: {
      labels: byPayer.map((p) => p.payer),
      datasets: [{ data: byPayer.map((p) => p.total), backgroundColor: PALETTE }],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
  });
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------
function renderTable() {
  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('emptyState');
  tbody.innerHTML = '';
  empty.classList.toggle('hidden', state.expenses.length > 0);

  const { key, dir } = state.sort;
  const factor = dir === 'asc' ? 1 : -1;
  const rows = [...state.expenses].sort((a, b) => {
    let cmp;
    if (key === 'amount') {
      cmp = a.amount - b.amount;
    } else {
      // date sort: empty dates always sink to the bottom
      if (!a.date && !b.date) cmp = 0;
      else if (!a.date) return 1;
      else if (!b.date) return -1;
      else cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    }
    return cmp * factor;
  });

  for (const e of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.date || '—'}</td>
      <td><span class="tag">${escapeHtml(e.category)}</span></td>
      <td>${escapeHtml(e.description) || '—'}</td>
      <td>${escapeHtml(e.payer)}</td>
      <td class="num">${peso(e.amount)}</td>
      <td><span class="badge ${e.status.toLowerCase()}">${e.status}</span></td>
      <td class="actions">
        <button class="btn-icon" data-edit="${e.id}" title="Edit">✏️</button>
        <button class="btn-icon danger" data-del="${e.id}" title="Delete">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  }
  updateSortIndicators();
}

function updateSortIndicators() {
  document.querySelectorAll('th.sortable').forEach((th) => {
    const ind = th.querySelector('.sort-ind');
    if (th.dataset.sort === state.sort.key) {
      ind.textContent = state.sort.dir === 'asc' ? '↑' : '↓';
    } else {
      ind.textContent = '';
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ---------------------------------------------------------------------------
// Filters population
// ---------------------------------------------------------------------------
async function populateFilters() {
  const res = await api(`${API}/expenses`);
  const all = await res.json();
  state.categories = [...new Set(all.map((e) => e.category))].sort();
  const years = [...new Set(all.map((e) => e.date.slice(0, 4)).filter(Boolean))].sort();

  const catSel = document.getElementById('filterCategory');
  const catList = document.getElementById('categoryList');
  catSel.innerHTML = '<option value="">All categories</option>';
  catList.innerHTML = '';
  for (const c of state.categories) {
    catSel.insertAdjacentHTML('beforeend', `<option>${escapeHtml(c)}</option>`);
    catList.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(c)}">`);
  }

  const yearSel = document.getElementById('filterYear');
  yearSel.innerHTML = '<option value="">All years</option>';
  for (const y of years) yearSel.insertAdjacentHTML('beforeend', `<option>${y}</option>`);
}

// ---------------------------------------------------------------------------
// Modal / form
// ---------------------------------------------------------------------------
const modal = document.getElementById('modal');
const form = document.getElementById('form');

function openModal(expense) {
  document.getElementById('modalTitle').textContent = expense ? 'Edit Expense' : 'Add Expense';
  document.getElementById('expenseId').value = expense?.id ?? '';
  document.getElementById('category').value = expense?.category ?? '';
  document.getElementById('payer').value = expense?.payer ?? 'Both';
  document.getElementById('status').value = expense?.status ?? 'Unpaid';
  document.getElementById('description').value = expense?.description ?? '';
  document.getElementById('amount').value = expense?.amount ?? '';
  document.getElementById('date').value = expense?.date ?? new Date().toISOString().slice(0, 10);
  document.getElementById('formError').classList.add('hidden');
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const id = document.getElementById('expenseId').value;
  const payload = {
    category: document.getElementById('category').value.trim(),
    payer: document.getElementById('payer').value,
    status: document.getElementById('status').value,
    description: document.getElementById('description').value.trim(),
    amount: document.getElementById('amount').value,
    date: document.getElementById('date').value,
  };

  const res = await api(`${API}/expenses${id ? '/' + id : ''}`, {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const box = document.getElementById('formError');
    box.textContent = (err.errors || ['Something went wrong']).join(', ');
    box.classList.remove('hidden');
    return;
  }

  closeModal();
  await refresh();
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
document.getElementById('addBtn').addEventListener('click', () => openModal(null));
document.getElementById('cancelBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

document.getElementById('tbody').addEventListener('click', async (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.del;
  if (editId) {
    const expense = state.expenses.find((x) => String(x.id) === editId);
    openModal(expense);
  } else if (delId) {
    if (!confirm('Delete this expense?')) return;
    await api(`${API}/expenses/${delId}`, { method: 'DELETE' });
    await refresh();
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch(`${API}/logout`, { method: 'POST' });
  window.location.href = '/login';
});

['search', 'filterCategory', 'filterPayer', 'filterStatus', 'filterYear'].forEach((id) => {
  const el = document.getElementById(id);
  el.addEventListener(id === 'search' ? 'input' : 'change', fetchExpenses);
});

// Scope (House / Wedding / All) refreshes cards, charts, and table together.
document.getElementById('scope').addEventListener('change', () => {
  Promise.all([fetchExpenses(), fetchStats()]);
});

// Clickable column headers to sort by date or amount.
document.querySelectorAll('th.sortable').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (state.sort.key === key) {
      state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sort.key = key;
      state.sort.dir = 'asc';
    }
    renderTable();
  });
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function refresh() {
  await Promise.all([fetchExpenses(), fetchStats(), populateFilters()]);
}

// ---------------------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------------------
let weddingLoaded = false;

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    const isWedding = name === 'wedding';
    const isOverall = name === 'overall';
    document.getElementById('house-view').classList.toggle('hidden', isWedding || isOverall);
    document.getElementById('wedding-view').classList.toggle('hidden', !isWedding);
    document.getElementById('overall-view').classList.toggle('hidden', !isOverall);
    document.getElementById('addBtn').classList.toggle('hidden', isWedding || isOverall);

    if (isWedding && !weddingLoaded) {
      fetchWeddingSuppliers();
    }
    if (isOverall) {
      fetchOverallStats();
    }
  });
});

// ---------------------------------------------------------------------------
// Wedding Suppliers
// ---------------------------------------------------------------------------
let weddingData = [];

const W_STATUSES   = ['Booked DP Paid', 'Fully Paid', 'Deciding'];
const W_CATEGORIES = [
  'HMUA Bride','HMUA Entourage','Ceremony and Reception','Coordinator',
  'Videographer','Photographer','Singer','Styling','Cocktail Hour',
  'Accommodation','Bride Outfit','Groom Outfit','Entourage Outfit',
  'Gifts/Souvenirs','Wedding Needs',
];

let weddingStatusFilter = '';
const openDetailRows = new Set();

// Populate category <select> in the modal once
W_CATEGORIES.forEach((c) => {
  document.getElementById('wMCategory').appendChild(new Option(c, c));
});

// --- API helpers -----------------------------------------------------------
async function fetchWeddingSuppliers() {
  const res  = await api(`${API}/wedding-suppliers`);
  weddingData = await res.json();
  weddingLoaded = true;
  renderWeddingView();
}

async function patchSupplier(id, fields) {
  const res = await api(`${API}/wedding-suppliers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || 'Save failed'); }
  const updated = await res.json();
  const idx = weddingData.findIndex((s) => String(s.id) === String(id));
  if (idx !== -1) weddingData[idx] = updated;
  return updated;
}

async function createSupplier(fields) {
  const res = await api(`${API}/wedding-suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error || 'Create failed'); }
  const created = await res.json();
  weddingData.push(created);
  return created;
}

async function deleteSupplier(id) {
  await api(`${API}/wedding-suppliers/${id}`, { method: 'DELETE' });
  weddingData = weddingData.filter((s) => String(s.id) !== String(id));
}

// --- Render ----------------------------------------------------------------
function renderWeddingView() {
  renderWeddingToolbar();
  renderWeddingSummary();
  renderWeddingGroups();
}

function renderWeddingToolbar() {
  const toolbar = document.getElementById('wToolbar');
  const labels  = { '': 'All', 'Booked DP Paid': 'Booked', 'Fully Paid': 'Fully Paid', 'Deciding': 'Deciding' };
  toolbar.innerHTML = `
    <div class="w-filter-bar">
      ${['', ...W_STATUSES].map((s) => `
        <button class="w-filter-btn${weddingStatusFilter === s ? ' active' : ''}" data-status="${escapeHtml(s)}">
          ${escapeHtml(labels[s] || s)}
        </button>`).join('')}
    </div>
    <button class="btn btn-pink" id="wAddBtn">+ Add Supplier</button>`;

  toolbar.querySelectorAll('.w-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      weddingStatusFilter = btn.dataset.status;
      renderWeddingToolbar();
      renderWeddingGroups();
    });
  });
  document.getElementById('wAddBtn').addEventListener('click', () => openWModal(null));
}

function renderWeddingSummary() {
  const t = weddingData.reduce(
    (a, s) => {
      a.estimated += s.estimated_amount;
      a.actual    += s.actual_amount;
      a.paid      += s.total_paid;
      a.balance   += s.balance;
      a.gaile     += s.gaile_paid;
      a.nald      += s.nald_paid;
      return a;
    },
    { estimated: 0, actual: 0, paid: 0, balance: 0, gaile: 0, nald: 0 }
  );
  const pct = t.actual > 0 ? Math.round((t.paid / t.actual) * 100) : 0;

  document.getElementById('wSummary').innerHTML = `
    <div class="w-card">
      <div class="label">Estimated Budget</div>
      <div class="value">${peso(t.estimated)}</div>
    </div>
    <div class="w-card">
      <div class="label">Actual Total</div>
      <div class="value">${peso(t.actual)}</div>
    </div>
    <div class="w-card w-accent">
      <div class="label">Total Paid</div>
      <div class="value">${peso(t.paid)}</div>
      <div class="sub">${pct}% of actual</div>
    </div>
    <div class="w-card w-balance">
      <div class="label">Remaining Balance</div>
      <div class="value">${peso(t.balance)}</div>
    </div>
    <div class="w-card w-gaile">
      <div class="label">Gaile Paid</div>
      <div class="value">${peso(t.gaile)}</div>
    </div>
    <div class="w-card w-nald">
      <div class="label">Nald Paid</div>
      <div class="value">${peso(t.nald)}</div>
    </div>`;
}

function renderWeddingGroups() {
  const filtered = weddingStatusFilter
    ? weddingData.filter((s) => s.status === weddingStatusFilter)
    : weddingData;

  const order = [];
  const groups = {};
  for (const s of filtered) {
    if (!groups[s.category]) { groups[s.category] = []; order.push(s.category); }
    groups[s.category].push(s);
  }

  const container = document.getElementById('wGroups');
  container.innerHTML = '';

  if (order.length === 0) {
    container.innerHTML = '<p class="empty">No suppliers match this filter.</p>';
    return;
  }

  for (const cat of order) {
    const rows    = groups[cat];
    const catActual = rows.reduce((a, r) => a + r.actual_amount, 0);
    const catPaid   = rows.reduce((a, r) => a + r.total_paid, 0);
    const catBal    = rows.reduce((a, r) => a + r.balance, 0);
    const catPct    = catActual > 0 ? Math.round((catPaid / catActual) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'w-group-card';
    card.innerHTML = `
      <div class="w-group-header">
        <div class="w-group-title">
          <span class="w-cat-name">${escapeHtml(cat)}</span>
          <span class="w-cat-count">${rows.length} supplier${rows.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="w-group-totals">
          <span>Actual <strong>${peso(catActual)}</strong></span>
          <span>Paid <strong>${peso(catPaid)}</strong></span>
          <span class="w-pct-badge">${catPct}%</span>
          <span>Balance <strong class="w-bal-val">${catBal > 0 ? peso(catBal) : '✓ Fully Paid'}</strong></span>
        </div>
      </div>
      <div class="w-progress-bar"><div class="w-progress-fill" style="width:${catPct}%"></div></div>
      <div class="w-table-wrap">
        <table class="w-table">
          <thead><tr>
            <th class="w-th-supplier">Supplier</th>
            <th class="num">Estimated</th>
            <th class="num">Actual</th>
            <th class="num">Gaile Paid</th>
            <th class="num">Nald Paid</th>
            <th class="num">Total Paid</th>
            <th class="num">Progress</th>
            <th class="num">Balance</th>
            <th>Status</th>
            <th>Contract</th>
            <th>Payments</th>
            <th></th>
          </tr></thead>
          <tbody>${rows.map(buildSupplierRow).join('')}</tbody>
        </table>
      </div>`;
    container.appendChild(card);
  }

  // Restore open detail rows
  openDetailRows.forEach((id) => {
    const dr  = document.getElementById(`wd-${id}`);
    const btn = document.querySelector(`.w-expand-btn[data-id="${id}"]`);
    if (dr)  dr.classList.remove('hidden');
    if (btn) btn.textContent = '▴';
  });
}

// --- Build one supplier row -----------------------------------------------
function buildSupplierRow(s) {
  const pct = s.actual_amount > 0 ? Math.min(100, Math.round((s.total_paid / s.actual_amount) * 100)) : 0;
  const statusClass =
    s.status === 'Fully Paid'     ? 'ws-fully-paid' :
    s.status === 'Booked DP Paid' ? 'ws-booked'     : 'ws-deciding';

  return `
    <tr class="w-row" data-sid="${s.id}">
      <td class="w-supplier-name">${escapeHtml(s.supplier_name)}</td>
      <td class="num">${peso(s.estimated_amount)}</td>
      <td class="num">${peso(s.actual_amount)}</td>
      <td class="num">${peso(s.gaile_paid)}</td>
      <td class="num">${peso(s.nald_paid)}</td>
      <td class="num w-derived">${peso(s.total_paid)}</td>
      <td class="num w-derived">
        <div class="w-mini-bar-wrap">
          <div class="w-mini-bar"><div class="w-mini-fill" style="width:${pct}%"></div></div>
          <span class="w-mini-pct">${pct}%</span>
        </div>
      </td>
      <td class="num ${s.balance > 0 ? 'w-bal-due' : 'w-bal-ok'}">${s.balance > 0 ? peso(s.balance) : '✓'}</td>
      <td><span class="ws-badge ${statusClass}">${escapeHtml(s.status)}</span></td>
      <td class="w-contract">${escapeHtml(s.contract_sent) || '—'}</td>
      <td class="w-payment-cell">
        <div class="w-pay-entry">
          <button class="w-done-btn${s.first_payment_done ? ' done' : ''}"
                  data-sid="${s.id}" data-field="first_payment_done"
                  title="${s.first_payment_done ? 'Unmark' : 'Mark as done'}"></button>
          <span class="w-pay-text${s.first_payment_done ? ' w-pay-done-text' : ''}">${escapeHtml(s.first_payment) || '—'}</span>
        </div>
        ${s.next_payment ? `<div class="w-pay-entry">
          <button class="w-done-btn${s.next_payment_done ? ' done' : ''}"
                  data-sid="${s.id}" data-field="next_payment_done"
                  title="${s.next_payment_done ? 'Unmark' : 'Mark as done'}"></button>
          <span class="w-pay-text${s.next_payment_done ? ' w-pay-done-text' : ''}">${escapeHtml(s.next_payment)}</span>
        </div>` : ''}
      </td>
      <td class="w-row-actions">
        <button class="w-edit-btn" data-edit-sid="${s.id}" title="Edit supplier">✏️</button>
        <button class="w-expand-btn" data-id="${s.id}" title="Payment notes / Remarks">▾</button>
        <button class="w-del-btn" data-sid="${s.id}" title="Delete supplier">🗑️</button>
      </td>
    </tr>
    <tr class="w-detail-row hidden" id="wd-${s.id}">
      <td colspan="12">
        <div class="w-detail-inner">
          <div class="w-detail-item">
            <div class="w-detail-label">Payment Notes</div>
            <div class="w-detail-text">${escapeHtml(s.payment_notes) || '<span class="w-detail-empty">—</span>'}</div>
          </div>
          <div class="w-detail-item">
            <div class="w-detail-label">Remarks</div>
            <div class="w-detail-text">${escapeHtml(s.remarks) || '<span class="w-detail-empty">—</span>'}</div>
          </div>
        </div>
      </td>
    </tr>`;
}

// --- Event delegation on #wGroups -----------------------------------------
document.getElementById('wGroups').addEventListener('click', async (e) => {
  // Edit supplier
  const editBtn = e.target.closest('.w-edit-btn');
  if (editBtn) {
    const sid = editBtn.dataset.editSid;
    const supplier = weddingData.find((s) => String(s.id) === sid);
    if (supplier) openWModal(supplier);
    return;
  }

  // Payment done toggle
  const doneBtn = e.target.closest('.w-done-btn');
  if (doneBtn) {
    const sid   = doneBtn.dataset.sid;
    const field = doneBtn.dataset.field;
    const supplier = weddingData.find((s) => String(s.id) === sid);
    if (!supplier) return;
    try {
      await patchSupplier(sid, { [field]: !supplier[field] });
      renderWeddingGroups();
    } catch (err) { console.error(err); }
    return;
  }

  // Expand/collapse notes
  const expandBtn = e.target.closest('.w-expand-btn');
  if (expandBtn) {
    const id = expandBtn.dataset.id;
    const detail = document.getElementById(`wd-${id}`);
    if (!detail) return;
    const isOpen = !detail.classList.contains('hidden');
    detail.classList.toggle('hidden', isOpen);
    expandBtn.textContent = isOpen ? '▾' : '▴';
    if (isOpen) openDetailRows.delete(id); else openDetailRows.add(id);
    return;
  }

  // Delete supplier
  const delBtn = e.target.closest('.w-del-btn');
  if (delBtn) {
    if (!confirm('Delete this supplier?')) return;
    const sid = delBtn.dataset.sid;
    try {
      await deleteSupplier(sid);
      openDetailRows.delete(sid);
      renderWeddingSummary();
      renderWeddingGroups();
    } catch (err) { console.error(err); }
  }
});

// --- Add Supplier Modal ---------------------------------------------------
const wModal     = document.getElementById('wModal');
const wModalForm = document.getElementById('wModalForm');

function openWModal(supplier) {
  document.getElementById('wModalTitle').textContent   = supplier ? 'Edit Supplier' : 'Add Supplier';
  document.getElementById('wMId').value                = supplier?.id ?? '';
  document.getElementById('wMCategory').value          = supplier?.category ?? '';
  document.getElementById('wMSupplier').value          = supplier?.supplier_name ?? '';
  document.getElementById('wMStatus').value            = supplier?.status ?? 'Deciding';
  document.getElementById('wMEstimated').value         = supplier?.estimated_amount ?? 0;
  document.getElementById('wMActual').value            = supplier?.actual_amount ?? 0;
  document.getElementById('wMGaile').value             = supplier?.gaile_paid ?? 0;
  document.getElementById('wMNald').value              = supplier?.nald_paid ?? 0;
  document.getElementById('wMContract').value          = supplier?.contract_sent ?? '';
  document.getElementById('wMFirstPay').value          = supplier?.first_payment ?? '';
  document.getElementById('wMNextPay').value           = supplier?.next_payment ?? '';
  document.getElementById('wMPayNotes').value          = supplier?.payment_notes ?? '';
  document.getElementById('wMRemarks').value           = supplier?.remarks ?? '';
  document.getElementById('wModalError').classList.add('hidden');
  wModal.classList.remove('hidden');
}

function closeWModal() { wModal.classList.add('hidden'); }

document.getElementById('wModalClose').addEventListener('click', closeWModal);
document.getElementById('wModalCancel').addEventListener('click', closeWModal);
wModal.addEventListener('click', (e) => { if (e.target === wModal) closeWModal(); });

wModalForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const id = document.getElementById('wMId').value;
  const fields = {
    category:         document.getElementById('wMCategory').value.trim(),
    supplier_name:    document.getElementById('wMSupplier').value.trim(),
    status:           document.getElementById('wMStatus').value,
    estimated_amount: parseFloat(document.getElementById('wMEstimated').value) || 0,
    actual_amount:    parseFloat(document.getElementById('wMActual').value) || 0,
    gaile_paid:       parseFloat(document.getElementById('wMGaile').value) || 0,
    nald_paid:        parseFloat(document.getElementById('wMNald').value) || 0,
    contract_sent:    document.getElementById('wMContract').value.trim(),
    first_payment:    document.getElementById('wMFirstPay').value.trim(),
    next_payment:     document.getElementById('wMNextPay').value.trim(),
    payment_notes:    document.getElementById('wMPayNotes').value.trim(),
    remarks:          document.getElementById('wMRemarks').value.trim(),
  };
  const errEl = document.getElementById('wModalError');
  try {
    if (id) { await patchSupplier(parseInt(id, 10), fields); }
    else    { await createSupplier(fields); }
    closeWModal();
    renderWeddingSummary();
    renderWeddingGroups();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

// ---------------------------------------------------------------------------
// Overall Total
// ---------------------------------------------------------------------------
async function fetchOverallStats() {
  // House stats (all scopes)
  const [statsRes, weddingRes] = await Promise.all([
    api(`${API}/stats`),
    weddingLoaded ? Promise.resolve(null) : api(`${API}/wedding-suppliers`),
  ]);
  const houseStats = await statsRes.json();
  if (weddingRes) {
    weddingData = await weddingRes.json();
    weddingLoaded = true;
  }
  renderOverallView(houseStats);
}

function renderOverallView(houseStats) {
  const h = houseStats.totals;

  const wTotals = weddingData.reduce(
    (a, s) => {
      a.estimated += s.estimated_amount;
      a.actual    += s.actual_amount;
      a.paid      += s.total_paid;
      a.balance   += s.balance;
      a.gaile     += s.gaile_paid;
      a.nald      += s.nald_paid;
      return a;
    },
    { estimated: 0, actual: 0, paid: 0, balance: 0, gaile: 0, nald: 0 }
  );

  const grandTotal  = h.total + wTotals.actual;
  const grandPaid   = h.paid  + wTotals.paid;
  const grandUnpaid = h.unpaid + wTotals.balance;
  const grandGaile  = (houseStats.byPayer.find((p) => p.payer === 'Gaile')?.total ?? 0) + wTotals.gaile;
  const grandNald   = (houseStats.byPayer.find((p) => p.payer === 'Nald')?.total ?? 0)  + wTotals.nald;
  const obligated   = grandPaid + grandUnpaid;
  const pct         = obligated ? Math.round((grandPaid / obligated) * 100) : 0;

  document.getElementById('overallCards').innerHTML = `
    <div class="card">
      <div class="label">Grand Total</div>
      <div class="value">${peso(grandTotal)}</div>
      <div class="sub">House + Wedding</div>
    </div>
    <div class="card paid">
      <div class="label">Total Paid</div>
      <div class="value">${peso(grandPaid)}</div>
      <div class="sub">${pct}% of dues</div>
    </div>
    <div class="card unpaid">
      <div class="label">Outstanding</div>
      <div class="value">${peso(grandUnpaid)}</div>
      <div class="sub">Unpaid + Wedding balance</div>
    </div>
    <div class="card planned">
      <div class="label">Planned</div>
      <div class="value">${peso(h.planned)}</div>
      <div class="sub">House planned expenses</div>
    </div>
    <div class="card">
      <div class="label">Gaile Total</div>
      <div class="value">${peso(grandGaile)}</div>
      <div class="sub">Across both trackers</div>
    </div>
    <div class="card">
      <div class="label">Nald Total</div>
      <div class="value">${peso(grandNald)}</div>
      <div class="sub">Across both trackers</div>
    </div>`;

  // House breakdown by category
  const houseCats = houseStats.byCategory.slice().sort((a, b) => b.total - a.total);
  document.getElementById('overallHouseDetail').innerHTML = `
    <table class="overall-table">
      <thead><tr>
        <th>Category</th>
        <th class="num">Total</th>
        <th class="num">Paid</th>
        <th class="num">Unpaid</th>
      </tr></thead>
      <tbody>
        ${houseCats.map((c) => `
          <tr>
            <td><span class="tag">${escapeHtml(c.category)}</span></td>
            <td class="num">${peso(c.total)}</td>
            <td class="num">${peso(c.paid)}</td>
            <td class="num">${peso(c.unpaid)}</td>
          </tr>`).join('')}
        <tr class="overall-total-row">
          <td><strong>Total</strong></td>
          <td class="num"><strong>${peso(h.total)}</strong></td>
          <td class="num"><strong>${peso(h.paid)}</strong></td>
          <td class="num"><strong>${peso(h.unpaid)}</strong></td>
        </tr>
      </tbody>
    </table>`;

  // Wedding breakdown by category
  const wCatMap = {};
  for (const s of weddingData) {
    if (!wCatMap[s.category]) wCatMap[s.category] = { actual: 0, paid: 0, balance: 0 };
    wCatMap[s.category].actual  += s.actual_amount;
    wCatMap[s.category].paid    += s.total_paid;
    wCatMap[s.category].balance += s.balance;
  }
  const wCats = Object.entries(wCatMap).sort((a, b) => b[1].actual - a[1].actual);
  document.getElementById('overallWeddingDetail').innerHTML = `
    <table class="overall-table">
      <thead><tr>
        <th>Category</th>
        <th class="num">Actual</th>
        <th class="num">Paid</th>
        <th class="num">Balance</th>
      </tr></thead>
      <tbody>
        ${wCats.map(([cat, t]) => `
          <tr>
            <td><span class="tag">${escapeHtml(cat)}</span></td>
            <td class="num">${peso(t.actual)}</td>
            <td class="num">${peso(t.paid)}</td>
            <td class="num">${t.balance > 0 ? peso(t.balance) : '<span class="badge paid">✓</span>'}</td>
          </tr>`).join('')}
        <tr class="overall-total-row">
          <td><strong>Total</strong></td>
          <td class="num"><strong>${peso(wTotals.actual)}</strong></td>
          <td class="num"><strong>${peso(wTotals.paid)}</strong></td>
          <td class="num"><strong>${wTotals.balance > 0 ? peso(wTotals.balance) : '<span class="badge paid">✓</span>'}</strong></td>
        </tr>
      </tbody>
    </table>`;
}

refresh();

