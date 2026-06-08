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
refresh();
