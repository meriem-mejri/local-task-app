const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'tasks.json');

function ensureFile() {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ lastId: 0, tasks: [] }, null, 2));
  }
}

function read() {
  ensureFile();
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function write(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function nowISO() {
  return new Date().toISOString();
}

module.exports = {
  all() {
    const db = read();
    return db.tasks.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  create({ title, description = '', status = 'todo', assignee_id = null }) {
    const db = read();
    const id = db.lastId + 1;
    const ts = nowISO();
    const task = { id, title, description, status, assignee_id, created_at: ts, updated_at: ts };
    db.lastId = id;
    db.tasks.push(task);
    write(db);
    return task;
  },
  get(id) {
    const db = read();
    return db.tasks.find(t => t.id === id) || null;
  },
  update(id, patch) {
    const db = read();
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const current = db.tasks[idx];
    const updated = { ...current, ...patch, updated_at: nowISO() };
    db.tasks[idx] = updated;
    write(db);
    return updated;
  },
  remove(id) {
    const db = read();
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    db.tasks.splice(idx, 1);
    write(db);
    return true;
  }
};