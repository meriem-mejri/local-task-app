# React + Vite Frontend

Modern React frontend for the local task management app with real-time Socket.IO updates.

## Features
- **React 18** with modern hooks
- **Vite** for fast dev/build
- **Socket.IO client** for real-time task updates
- **Kanban-style board** with three columns (À faire, En cours, Terminé)
- **Task CRUD** operations
- **Responsive design** mobile-friendly
- **Modern UI** with gradient backgrounds and smooth animations

## Install & Run

```bash
npm install
npm run dev
```

Opens on `http://localhost:5173` with proxy to backend on `http://localhost:3000`.

## Project Structure
```
src/
├── main.jsx           # Entry point
├── App.jsx            # Main app with Socket.IO
├── App.css
├── index.css
└── components/
    ├── TaskForm.jsx   # Form to create new tasks
    ├── TaskForm.css
    ├── TaskList.jsx   # Kanban board layout
    ├── TaskList.css
    ├── TaskCard.jsx   # Individual task card
    └── TaskCard.css
```

## Real-time Sync
- Connected to backend via Socket.IO
- Listens for `task:created`, `task:updated`, `task:deleted` events
- Automatically updates task list when other clients make changes

## Build for Production

```bash
npm run build
npm run preview
```
