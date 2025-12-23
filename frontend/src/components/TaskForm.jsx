import React, { useState } from 'react';
import './TaskForm.css';

function TaskForm({ onSubmit }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Veuillez entrer un titre');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
      });
      setTitle('');
      setDescription('');
      setStatus('todo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h2>➕ Nouvelle Tâche</h2>
      
      <div className="form-group">
        <label htmlFor="title">Titre *</label>
        <input
          id="title"
          type="text"
          placeholder="Ex: Implémenter le dashboard"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          placeholder="Détails de la tâche..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="status">Statut</label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={submitting}
        >
          <option value="todo">À faire</option>
          <option value="doing">En cours</option>
          <option value="done">Terminé</option>
        </select>
      </div>

      <button type="submit" disabled={submitting} className="submit-btn">
        {submitting ? 'Création en cours...' : 'Créer Tâche'}
      </button>
    </form>
  );
}

export default TaskForm;
