import React from 'react';
import TaskCard from './TaskCard';
import './TaskList.css';

function TaskList({ tasks, onUpdateTask, onDeleteTask }) {
  const todoTasks = tasks.filter((t) => t.status === 'todo');
  const doingTasks = tasks.filter((t) => t.status === 'doing');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  const Column = ({ title, tasks, icon }) => (
    <div className="column">
      <div className="column-header">
        <h3>
          {icon} {title}
        </h3>
        <span className="count">{tasks.length}</span>
      </div>
      <div className="tasks-container">
        {tasks.length === 0 ? (
          <p className="empty-state">Aucune tâche</p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="task-list">
      <h2>📊 Tableau Kanban</h2>
      <div className="board">
        <Column title="À faire" icon="📌" tasks={todoTasks} />
        <Column title="En cours" icon="⚙️" tasks={doingTasks} />
        <Column title="Terminé" icon="✅" tasks={doneTasks} />
      </div>
    </div>
  );
}

export default TaskList;
