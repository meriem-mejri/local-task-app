require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const tasksRouter = require('./tasksRouter');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/tasks', tasksRouter);

// Serve static frontend
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[API] Server listening on http://localhost:${PORT}`);
  console.log('[API] ✓ Connected to PostgreSQL database');
});