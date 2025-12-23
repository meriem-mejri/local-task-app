# Local Collaborative Task App (No Cloud)

Backend: Express + SQLite (better-sqlite3) + Socket.IO. Frontend is served statically by Express.

## Run locally

1. Install Node.js 18+
2. Install dependencies:

```
npm install
```

3. Start the server:

```
npm start
```

4. Open http://localhost:3000 in your browser.

## Structure
- src/server.js: Express + Socket.IO server
- src/db.js: SQLite database setup
- src/tasksRouter.js: CRUD endpoints for tasks
- public/index.html, public/app.js: Minimal UI
- data/tasks.db: SQLite file created on first run

## API
- GET /api/tasks
- POST /api/tasks { title, description?, status? }
- PUT /api/tasks/:id { title?, description?, status?, assignee_id? }
- DELETE /api/tasks/:id

## Notes
- This app is local-only and does not use any cloud services.
- Real-time collaboration works on the local network if you expose the server IP and multiple clients connect.

