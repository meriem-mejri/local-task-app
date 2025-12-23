const api = {
  async list() {
    const res = await fetch('/api/tasks');
    return res.json();
  },
  async create({ title, description, status }) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, status })
    });
    if (!res.ok) throw new Error('create failed');
    return res.json();
  },
  async update(id, patch) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (!res.ok) throw new Error('update failed');
    return res.json();
  },
  async remove(id) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('delete failed');
  }
};

const tasksEl = document.getElementById('tasks');

function render(tasks) {
  tasksEl.innerHTML = '';
  for (const t of tasks) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div><strong>${escapeHtml(t.title)}</strong></div>
      <div>${escapeHtml(t.description || '')}</div>
      <div class="row">
        <label>Status:
          <select data-id="${t.id}" class="status">
            <option value="todo" ${t.status === 'todo' ? 'selected' : ''}>À faire</option>
            <option value="doing" ${t.status === 'doing' ? 'selected' : ''}>En cours</option>
            <option value="done" ${t.status === 'done' ? 'selected' : ''}>Terminé</option>
          </select>
        </label>
        <button data-id="${t.id}" class="delete">Supprimer</button>
      </div>
      <div class="status">MAJ: ${new Date(t.updated_at).toLocaleString()}</div>
    `;
    tasksEl.appendChild(card);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

async function refresh() {
  const tasks = await api.list();
  render(tasks);
}

document.getElementById('refresh').addEventListener('click', refresh);

document.getElementById('create').addEventListener('click', async () => {
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('desc').value.trim();
  const status = document.getElementById('status').value;
  if (!title) return alert('Titre requis');
  try {
    await api.create({ title, description, status });
    document.getElementById('title').value = '';
    document.getElementById('desc').value = '';
  } catch (e) {
    alert('Erreur création');
  }
});

// Delegate events for updates and delete
tasksEl.addEventListener('change', async (e) => {
  if (e.target.classList.contains('status')) {
    const id = Number(e.target.dataset.id);
    const status = e.target.value;
    try {
      await api.update(id, { status });
    } catch (e) {
      alert('Erreur mise à jour');
    }
  }
});

tasksEl.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete')) {
    const id = Number(e.target.dataset.id);
    try {
      await api.remove(id);
    } catch (e) {
      alert('Erreur suppression');
    }
  }
});

// Socket.IO realtime
const socket = io();
socket.on('connect', () => console.log('connected', socket.id));
socket.on('task:created', refresh);
socket.on('task:updated', refresh);
socket.on('task:deleted', refresh);

// Initial load
refresh();