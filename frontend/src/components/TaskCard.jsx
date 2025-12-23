import React, { useState } from 'react';
import './TaskCard.css';

function TaskCard({ task, onUpdate, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [editedDesc, setEditedDesc] = useState(task.description || '');

  const handleStatusChange = (e) => {
    onUpdate(task.id, { 
      title: task.title,
      description: task.description || '',
      status: e.target.value 
    });
  };

  const handleSaveEdit = async () => {
    await onUpdate(task.id, {
      title: editedTitle || task.title,
      description: editedDesc,
      status: task.status,
    });
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      onDelete(task.id);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusIcons = {
    todo: '📌',
    doing: '⚙️',
    done: '✅',
  };

  if (isEditing) {
    return (
      <div className="task-card editing">
        <input
          type="text"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          className="edit-input"
          placeholder="Titre"
        />
        <textarea
          value={editedDesc}
          onChange={(e) => setEditedDesc(e.target.value)}
          className="edit-textarea"
          placeholder="Description"
          rows={2}
        />
        <div className="edit-buttons">
          <button onClick={handleSaveEdit} className="save-btn">
            Enregistrer
          </button>
          <button onClick={() => setIsEditing(false)} className="cancel-btn">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`task-card status-${task.status}`}>
      <div className="card-header">
        <h4>{task.title}</h4>
        <span className="status-icon">{statusIcons[task.status]}</span>
      </div>

      {task.description && (
        <p className="description">{task.description}</p>
      )}

      <div className="card-meta">
        <span className="date">🕐 {formatDate(task.updated_at)}</span>
      </div>

      <div className="card-controls">
        <select
          value={task.status}
          onChange={handleStatusChange}
          className="status-select"
        >
          <option value="todo">À faire</option>
          <option value="doing">En cours</option>
          <option value="done">Terminé</option>
        </select>

        <button
          onClick={() => setIsEditing(true)}
          className="edit-btn"
          title="Éditer"
        >
          ✏️
        </button>

        <button
          onClick={handleDeleteClick}
          className="delete-btn"
          title="Supprimer"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default TaskCard;
