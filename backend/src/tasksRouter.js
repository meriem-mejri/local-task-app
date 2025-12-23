const express = require('express');
const pool = require('./db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// GET all tasks
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tasks ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST new task
router.post('/', async (req, res) => {
  try {
    const { title, description, status = 'todo' } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const id = uuidv4();
    
    const result = await pool.query(
      `INSERT INTO tasks (id, title, description, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [id, title.trim(), description?.trim() || null, status]
    );
    
    const newTask = result.rows[0];
    res.status(201).json(newTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const result = await pool.query(
      `UPDATE tasks 
       SET title = $1, description = $2, status = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [title.trim(), description?.trim() || null, status || 'todo', id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const updatedTask = result.rows[0];
    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// DELETE task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;