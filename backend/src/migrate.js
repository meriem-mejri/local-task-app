require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigrations() {
  try {
    const sqlFile = fs.readFileSync(
      path.join(__dirname, '../migrations/001_create_tasks_table.sql'),
      'utf8'
    );
    
    await pool.query(sqlFile);
    console.log('✓ Migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
