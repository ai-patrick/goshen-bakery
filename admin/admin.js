/* ============================================================
   GOSHEN BAKERY — ADMIN DASHBOARD (admin.js)
   Auth flow, cake CRUD, bulk pricing, contact submissions.
============================================================ */

const API = 'http://localhost:3000'; // Development backend URL
let TOKEN = localStorage.getItem('goshen_token') || '';
let currentUser = localStorage.getItem('goshen_user') || '';

/* ── Utility: authenticated fetch ───────────────────────── */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;

  // If sending FormData, remove Content-Type so browser sets it with boundary
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const res = await fetch(API + path, { ...options, headers });

  if (res.status === 401) {
    logout();
    throw new Error('Session expired. Please log in again.');
  }
  return res;
}

/* ── Format KES price ────────────────────────────────────── */
function fmtPrice(p) {
  return Number(p).toLocaleString('en-KE');
}

/* ── Format date ─────────────────────────────────────────── */
function fmtDate(dt) {
  return new Date(dt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ============================================================
   AUTH — LOGIN / LOGOUT
============================================================ */
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');

function showDashboard() {
  loginScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  document.getElementById('topbarUser').textContent = currentUser;
  initDashboard();
}

function showLogin() {
  loginScreen.classList.remove('hidden');
  dashboard.classList.add('hidden');
}

function logout() {
  TOKEN = '';
  currentUser = '';
  localStorage.removeItem('goshen_token');
  localStorage.removeItem('goshen_user');
  showLogin();
}

document.getElementById('logoutBtn').addEventListener('click', logout);

// Login form
document.getElementById('loginBtn').addEventListener('click', async () => {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  if (!username || !password) {
    errEl.textContent = 'Please enter your username and password.';
    errEl.classList.add('show');
    return;
  }

  btn.textContent = 'Signing in…';
  btn.disabled = true;

  try {
    const res = await fetch(API + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials.');

    TOKEN = data.token;
    currentUser = data.username;
    localStorage.setItem('goshen_token', TOKEN);
    localStorage.setItem('goshen_user', currentUser);
    errEl.classList.remove('show');
    showDashboard();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.add('show');
  } finally {
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
});

// Allow Enter key on login inputs
['loginUser', 'loginPass'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });
});

/* ============================================================
   NAVIGATION — panel switching
============================================================ */
const panels = {
  cakes: document.getElementById('panelCakes'),
  pricing: document.getElementById('panelPricing'),
  contacts: document.getElementById('panelContacts')
};
const titles = { cakes: 'Cake Gallery', pricing: 'Pricing', contacts: 'Order Enquiries' };

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const key = btn.dataset.panel;
    Object.values(panels).forEach(p => p.classList.remove('active'));
    panels[key].classList.add('active');
    document.getElementById('topbarTitle').textContent = titles[key];
    if (key === 'pricing') loadPricingPanel();
    if (key === 'contacts') loadContacts();
  });
});

/* ============================================================
   INIT DASHBOARD
============================================================ */
async function initDashboard() {
  await Promise.all([loadCakes(), loadStats()]);
}

/* ── Stats ───────────────────────────────────────────────── */
async function loadStats() {
  try {
    const [cakesRes, contactsRes] = await Promise.all([
      apiFetch('/api/cakes/admin/all'),
      apiFetch('/api/cakes/admin/contacts')
    ]);
    const cakes = await cakesRes.json();
    const contacts = await contactsRes.json();
    const today = new Date().toDateString();
    const newToday = contacts.filter(c => new Date(c.createdAt).toDateString() === today).length;
    const newCount = contacts.filter(c => c.status === 'new').length;

    document.getElementById('statTotal').textContent = cakes.length;
    document.getElementById('statActive').textContent = cakes.filter(c => c.is_active).length;
    document.getElementById('statEnquiries').textContent = contacts.length;
    document.getElementById('statNew').textContent = newToday;

    // Badge on nav
    const badge = document.getElementById('newBadge');
    if (newCount > 0) {
      badge.textContent = newCount;
      badge.classList.add('show');
    }
  } catch (err) {
    console.error('[Stats]', err.message);
  }
}

/* ============================================================
   CAKE TABLE
============================================================ */
let cakesCache = [];

async function loadCakes() {
  const tbody = document.getElementById('cakeTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading…</td></tr>';

  try {
    const res = await apiFetch('/api/cakes/admin/all');
    cakesCache = await res.json();
    renderCakeTable(cakesCache);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row" style="color:#f87171">Failed to load cakes.</td></tr>';
  }
}

function renderCakeTable(cakes) {
  const tbody = document.getElementById('cakeTableBody');
  if (!cakes.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No cakes yet. Add one!</td></tr>';
    return;
  }

  tbody.innerHTML = cakes.map(cake => `
    <tr data-id="${cake._id}" class="${cake.is_active ? '' : 'cake-row-hidden'}">
      <td>
        ${cake.image_url
      ? `<img src="${cake.image_url}" alt="${cake.alt_text || ''}" class="thumb" />`
      : `<div class="thumb-placeholder">🎂</div>`}
      </td>
      <td style="color:var(--text);font-weight:500">
        ${cake.name || '<i>(No Name)</i>'}
        ${!cake.is_active ? ' <small style="color:#f87171;font-weight:400">(Hidden)</small>' : ''}
      </td>
      <td><span style="text-transform:capitalize">${cake.category}</span></td>
      <td>
        <span class="status-badge ${cake.is_active ? 'status-active' : 'status-hidden'}">
          ${cake.is_active ? 'Active' : 'Hidden'}
        </span>
      </td>
      <td>
        <div class="row-actions">
          <button class="action-btn edit" onclick="openEditModal('${cake._id}')">Edit</button>
          ${cake.is_active
      ? `<button class="action-btn delete" onclick="confirmHide('${cake._id}', '${escHtml(cake.name || 'Unnamed Cake')}')">Hide</button>`
      : `<button class="action-btn restore" onclick="restoreCake('${cake._id}')">Restore</button>`}
          <button class="action-btn delete" onclick="confirmDelete('${cake._id}', '${escHtml(cake.name || 'Unnamed Cake')}')" style="margin-left:auto" title="Delete Permanently">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function escHtml(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/* ── Hide/Delete cake ────────────────────────────────────── */
let pendingActionId = null;

function confirmHide(id, name) {
  pendingActionId = id;
  document.getElementById('confirmMsg').textContent = `Hide "${name}" from the public gallery? You can restore it later.`;
  document.getElementById('confirmModal').classList.remove('hidden');
}

document.getElementById('confirmCancel').addEventListener('click', () => {
  pendingActionId = null;
  document.getElementById('confirmModal').classList.add('hidden');
});

document.getElementById('confirmOk').addEventListener('click', async () => {
  if (!pendingActionId) return;
  const btn = document.getElementById('confirmOk');
  const oldText = btn.textContent;
  btn.textContent = 'Hiding…';
  btn.disabled = true;

  try {
    const res = await apiFetch('/api/cakes/admin/' + pendingActionId, { method: 'DELETE' });
    if (!res.ok) throw new Error('Hide failed');
    pendingActionId = null;
    document.getElementById('confirmModal').classList.add('hidden');
    await loadCakes();
    await loadStats();
  } catch (err) {
    alert('Error hiding cake: ' + err.message);
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
});

function confirmDelete(id, name) {
  pendingActionId = id;
  const modal = document.getElementById('deleteModal');
  document.getElementById('deleteMsg').innerHTML = `This will completely remove <strong>"${name}"</strong> and its image from the server. <br><br><span style="color:#f87171">This action cannot be undone.</span>`;
  modal.classList.remove('hidden');
}

document.getElementById('deleteCancel').addEventListener('click', () => {
  pendingActionId = null;
  document.getElementById('deleteModal').classList.add('hidden');
});

document.getElementById('deleteOk').addEventListener('click', async () => {
  if (!pendingActionId) return;
  const btn = document.getElementById('deleteOk');
  const oldText = btn.textContent;
  btn.textContent = 'Deleting…';
  btn.disabled = true;

  try {
    const res = await apiFetch('/api/cakes/admin/' + pendingActionId + '/permanent', { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    pendingActionId = null;
    document.getElementById('deleteModal').classList.add('hidden');
    await loadCakes();
    await loadStats();
  } catch (err) {
    alert('Error deleting cake: ' + err.message);
  } finally {
    btn.textContent = oldText;
    btn.disabled = false;
  }
});

/* ── Restore cake ────────────────────────────────────────── */
async function restoreCake(id) {
  try {
    await apiFetch('/api/cakes/admin/' + id, {
      method: 'PUT',
      body: JSON.stringify({ is_active: 1 })
    });
    await loadCakes();
    await loadStats();
  } catch (err) {
    alert('Could not restore cake: ' + err.message);
  }
}

/* ============================================================
   ADD / EDIT CAKE MODAL
============================================================ */
const modal = document.getElementById('cakeModal');
const modalTitle = document.getElementById('modalTitle');
const modalError = document.getElementById('modalError');

function openAddModal() {
  modalTitle.textContent = 'Add Cake';
  document.getElementById('cakeId').value = '';
  document.getElementById('cakeName').value = '';
  document.getElementById('cakeCategory').value = 'celebration';
  document.getElementById('cakePrice').value = '';
  document.getElementById('cakeActive').value = '1';
  document.getElementById('cakeDesc').value = '';
  document.getElementById('cakeAlt').value = '';
  clearImagePreview();
  modalError.classList.remove('show');
  modal.classList.remove('hidden');
}

function openEditModal(id) {
  const cake = cakesCache.find(c => c._id === id);
  if (!cake) return;
  modalTitle.textContent = 'Edit Cake';
  document.getElementById('cakeId').value = cake._id;
  document.getElementById('cakeName').value = cake.name || '';
  document.getElementById('cakeCategory').value = cake.category;
  document.getElementById('cakePrice').value = cake.price || 0;
  document.getElementById('cakeActive').value = String(cake.is_active);
  document.getElementById('cakeDesc').value = cake.description || '';
  document.getElementById('cakeAlt').value = cake.alt_text || '';
  // Show existing image preview
  if (cake.image_url) {
    const preview = document.getElementById('imgPreview');
    preview.src = cake.image_url;
    preview.style.display = 'block';
    document.getElementById('uploadPlaceholder').style.display = 'none';
  } else {
    clearImagePreview();
  }
  modalError.classList.remove('show');
  modal.classList.remove('hidden');
}

document.getElementById('addCakeBtn').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalCancel').addEventListener('click', closeModal);

function closeModal() {
  modal.classList.add('hidden');
  document.getElementById('imageInput').value = '';
}

// Close on backdrop click
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/* ── Image upload / drag-drop ────────────────────────────── */
const uploadZone = document.getElementById('uploadZone');
const imageInput = document.getElementById('imageInput');
const imgPreview = document.getElementById('imgPreview');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');

uploadZone.addEventListener('click', () => imageInput.click());
uploadZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') imageInput.click(); });

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) previewImage(file);
});

imageInput.addEventListener('change', () => {
  if (imageInput.files[0]) previewImage(imageInput.files[0]);
});

function previewImage(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    imgPreview.src = ev.target.result;
    imgPreview.style.display = 'block';
    uploadPlaceholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function clearImagePreview() {
  imgPreview.src = '';
  imgPreview.style.display = 'none';
  uploadPlaceholder.style.display = 'flex';
}

/* ── Save cake (create or update) ───────────────────────── */
document.getElementById('modalSave').addEventListener('click', async () => {
  const id = document.getElementById('cakeId').value;
  const name = document.getElementById('cakeName').value.trim();
  const category = document.getElementById('cakeCategory').value;
  const price = document.getElementById('cakePrice').value;
  const is_active = document.getElementById('cakeActive').value;
  const description = document.getElementById('cakeDesc').value.trim();
  const alt_text = document.getElementById('cakeAlt').value.trim();
  const saveBtn = document.getElementById('modalSave');

  modalError.classList.remove('show');

  const formData = new FormData();
  formData.append('name', name);
  formData.append('category', category);
  formData.append('price', price || 0);
  formData.append('is_active', is_active);
  formData.append('description', description);
  formData.append('alt_text', alt_text);
  if (imageInput.files[0]) formData.append('image', imageInput.files[0]);

  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;

  try {
    const isEdit = Boolean(id);
    const res = await apiFetch(
      isEdit ? '/api/cakes/admin/' + id : '/api/cakes/admin',
      { method: isEdit ? 'PUT' : 'POST', body: formData, headers: {} }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed.');
    closeModal();
    await loadCakes();
    await loadStats();
  } catch (err) {
    modalError.textContent = err.message;
    modalError.classList.add('show');
  } finally {
    saveBtn.textContent = 'Save Cake';
    saveBtn.disabled = false;
  }
});

/* ============================================================
   BULK PRICING PANEL
============================================================ */
async function loadPricingPanel() {
  const tbody = document.getElementById('priceTableBody');
  tbody.innerHTML = '<tr><td colspan="3" class="loading-row">Loading…</td></tr>';

  try {
    const res = await apiFetch('/api/cakes/admin/all');
    const cakes = await res.json();
    tbody.innerHTML = cakes.map(cake => `
      <tr>
        <td style="color:var(--text);font-weight:500">${cake.name || '<i>(No Name)</i>'}</td>
        <td style="text-transform:capitalize">${cake.category}</td>
        <td>
          <input
            type="number"
            class="price-input"
            data-id="${cake._id}"
            value="${cake.price}"
            min="0"
            step="100"
            aria-label="Price for ${cake.name || 'Unnamed Cake'}"
          />
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="3" class="loading-row" style="color:#f87171">Failed to load.</td></tr>';
  }
}

document.getElementById('savePricesBtn').addEventListener('click', async () => {
  const inputs = document.querySelectorAll('.price-input');
  const updates = Array.from(inputs).map(inp => ({ id: inp.dataset.id, price: inp.value }));
  const msgEl = document.getElementById('priceSaveMsg');
  const saveBtn = document.getElementById('savePricesBtn');

  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;
  msgEl.className = 'save-msg';
  msgEl.textContent = '';

  try {
    const res = await apiFetch('/api/cakes/admin/bulk-price', {
      method: 'PUT',
      body: JSON.stringify({ updates })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Save failed.');
    msgEl.textContent = '✓ All prices saved!';
    msgEl.className = 'save-msg success';
    // Refresh cakes cache in background
    loadCakes();
  } catch (err) {
    msgEl.textContent = '✗ ' + err.message;
    msgEl.className = 'save-msg error';
  } finally {
    saveBtn.textContent = 'Save All Prices';
    saveBtn.disabled = false;
    setTimeout(() => { msgEl.className = 'save-msg'; msgEl.textContent = ''; }, 4000);
  }
});

/* ============================================================
   CONTACT SUBMISSIONS
============================================================ */
async function loadContacts() {
  const tbody = document.getElementById('contactTableBody');
  tbody.innerHTML = '<tr><td colspan="5" class="loading-row">Loading…</td></tr>';

  try {
    const res = await apiFetch('/api/cakes/admin/contacts');
    const contacts = await res.json();

    if (!contacts.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No enquiries yet.</td></tr>';
      return;
    }

    tbody.innerHTML = contacts.map(c => `
      <tr>
        <td style="white-space:nowrap">${fmtDate(c.createdAt)}</td>
        <td style="color:var(--text);font-weight:500">${c.first_name} ${c.last_name}</td>
        <td>
          <a href="mailto:${c.email}" style="color:var(--plum-light)">${c.email}</a><br>
          <small style="color:var(--text-dim)">${c.phone || '—'}</small>
        </td>
        <td style="max-width:240px">
          <span style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            ${c.occasion || '—'}
          </span>
        </td>
        <td>
          <select class="status-select" data-id="${c._id}" aria-label="Status for ${c.first_name}">
            <option value="new"       ${c.status === 'new' ? 'selected' : ''}>New</option>
            <option value="contacted" ${c.status === 'contacted' ? 'selected' : ''}>Contacted</option>
            <option value="completed" ${c.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </td>
      </tr>
    `).join('');

    // Attach change handlers to status selects
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.dataset.id;
        const status = sel.value;
        try {
          await apiFetch('/api/cakes/admin/contacts/' + id, {
            method: 'PUT',
            body: JSON.stringify({ status })
          });
          await loadStats(); // update badge
        } catch (err) {
          alert('Could not update status: ' + err.message);
          sel.value = sel.dataset.prev || 'new';
        }
        sel.dataset.prev = status;
      });
      sel.dataset.prev = sel.value;
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="loading-row" style="color:#f87171">Failed to load enquiries.</td></tr>';
  }
}

/* ============================================================
   INIT — check for existing session
============================================================ */
if (TOKEN) {
  // Validate token by making a lightweight authenticated request
  apiFetch('/api/cakes/admin/all')
    .then(res => {
      if (res.ok) showDashboard();
      else showLogin();
    })
    .catch(() => showLogin());
} else {
  showLogin();
}
