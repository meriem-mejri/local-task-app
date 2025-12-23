# Task App - Complete Setup & Deployment Guide

A collaborative task management app built with React, Node.js/Express, and PostgreSQL.

## Table of Contents
1. [Local Development](#local-development)
2. [AWS Deployment](#aws-deployment)
3. [Architecture](#architecture)
4. [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites
- **Node.js 18+** (download from [nodejs.org](https://nodejs.org))
- **Docker Desktop** (download from [docker.com](https://www.docker.com/products/docker-desktop))
- **Git** (optional, for cloning)

### Quick Start (3 steps)

#### 1. Start PostgreSQL with Docker
```powershell
docker run -d `
  --name task-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=taskdb `
  -p 5432:5432 `
  postgres:15-alpine
```

Verify it's running:
```powershell
docker ps | Select-String task-postgres
```

#### 2. Install Dependencies & Run Migrations
```powershell
cd local-task-app
npm install
cd backend
npm install
node src/migrate.js
cd ..
```

Output should show:
```
✓ Connected to PostgreSQL database
✓ Migrations completed successfully
```

#### 3. Start Dev Server
```powershell
npm run dev
```

Output:
```
[API] ✓ Server listening on http://localhost:3000
[API] ✓ Connected to PostgreSQL database
[UI] ➜ Local: http://localhost:5173/
```

**Open in browser**: http://localhost:5173/

### Testing CRUD Operations

In the app UI:
1. **Create**: Type task title + description → Click "Ajouter"
2. **Read**: All tasks appear in the list
3. **Update**: Click ✏️ to edit name/description, or change status dropdown
4. **Delete**: Click 🗑️ to delete (confirms first)

### Verify Database
```powershell
docker exec -it task-postgres psql -U postgres -d taskdb -c "SELECT * FROM tasks;"
```

---

## AWS Deployment

### Two-Phase Deployment Strategy

#### Phase A: Sandbox Testing (Free)
Test all infrastructure in sandbox environment before spending AWS budget.

**What to deploy:**
- VPC with 8 subnets (2 public, 6 private) across 2 Availability Zones
- 6 Security Groups (SG-ALB-External, SG-ALB-Internal, SG-FE, SG-BE, SG-DB, SG-Bastion)
- 1 Bastion host + 1 Frontend EC2 + 1 Backend EC2 (no ALBs)
- RDS PostgreSQL Single-AZ
- CloudWatch monitoring + CloudTrail

**Cost**: $0 (sandbox environment)

---

#### Phase B: AWS Production ($50/student x 2)
After sandbox validation, deploy full production architecture on AWS.

**Full Architecture:**
- VPC: 10.0.0.0/16 with 8 subnets across 2 AZs
  - 2 Public (ALB, NAT, Bastion)
  - 2 Private Frontend (10.0.11.0/24, 10.0.12.0/24)
  - 2 Private Backend (10.0.21.0/24, 10.0.22.0/24)
  - 2 Private RDS (10.0.31.0/24, 10.0.32.0/24)
- 6 Security Groups with detailed inbound/outbound rules
- 2 Application Load Balancers (external + internal)
- Auto Scaling Groups (2-4 instances frontend, 2-4 backend)
- RDS PostgreSQL Multi-AZ (or Single-AZ to save $25/month)
- S3 + CloudFront (optional)
- CloudWatch, CloudTrail, SNS alerts

**Estimated Cost**: ~$100-120/month (shared between 2 students)
**Deployment Time**: 6-8 hours

---

### Complete Deployment Guide
Follow **[AWS_COMPLETE_DEPLOYMENT.md](AWS_COMPLETE_DEPLOYMENT.md)** for:
- Step-by-step instructions for all 8 teacher requirements
- Detailed security group rules with AWS Console field mappings
- Phase A sandbox modifications (skip ALBs)
- Phase B production setup (full architecture)
- Cost optimization strategies
- Testing checklist and troubleshooting

Also see:
- [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md) - Quick overview and architecture summary

---

## Architecture

### Local Stack
```
Frontend (React)         Backend (Node.js/Express)    Database (PostgreSQL)
http://localhost:5173   http://localhost:3000        localhost:5432
├─ Vite dev server     ├─ Express API                ├─ taskdb database
└─ HMR enabled         ├─ CORS enabled               └─ tasks table
                       └─ /api/tasks routes
```

### AWS Stack (Production Architecture - Phase B)
```
Internet
   │
   ├─── CloudFront (CDN for static assets - optional)
   │
   └─── ALB-External (Public Subnets)
        ├─ HTTPS/HTTP from 0.0.0.0/0
        │
        └─── Frontend EC2 Instances (Private Subnets A & B)
             ├─ Auto Scaling Group (2-4 instances)
             ├─ Nginx serves React SPA
             │
             └─── ALB-Internal (Private Subnets)
                  │
                  └─── Backend EC2 Instances (Private Subnets A & B)
                       ├─ Auto Scaling Group (2-4 instances)
                       ├─ Node.js API (port 3000)
                       │
                       └─── RDS PostgreSQL Multi-AZ (Private DB Subnets)
```

### AWS Stack (Sandbox - Phase A)
```
Internet
   │
   ├── Frontend EC2 (public IP:80)
   │   └─ Nginx serves React build
   │
   ├── Backend EC2 (public IP:3000)
   │   └─ Node.js API
   │
   └── RDS PostgreSQL Single-AZ (private subnet)
```

### API Endpoints
All endpoints return JSON and require `Content-Type: application/json` for POST/PUT.

| Method | Endpoint       | Body                                      | Response       |
|--------|----------------|-------------------------------------------|----------------|
| GET    | /api/tasks     | —                                         | Task[]         |
| POST   | /api/tasks     | `{title, description?, status?}`          | Task (201)     |
| PUT    | /api/tasks/:id | `{title, description?, status?}`          | Task           |
| DELETE | /api/tasks/:id | —                                         | 204 No Content |

**Status values**: `"todo"`, `"doing"`, `"done"` (defaults to `"todo"`)

---

## Tech Stack

| Layer    | Technology        | Version |
|----------|-------------------|---------|
| Frontend | React             | 18.2.0  |
| Build    | Vite              | 5.4.21  |
| Backend  | Express.js        | 4.19.2  |
| Runtime  | Node.js           | 18+     |
| Database | PostgreSQL        | 15      |
| DB Driver| pg (node-postgres)| 8.16.3  |

---

## Development Notes

### Key Changes from Original
- **Socket.IO removed**: Simplified to HTTP polling (no real-time sync, reduces complexity)
- **Two-phase deployment**: Test in sandbox (free) before AWS production ($50/student)
- **Production architecture**: 8 subnets, 6 security groups, 2 ALBs, Auto Scaling
- **Cost optimization**: Single-AZ RDS option saves $25/month vs Multi-AZ
- **Sandbox testing**: Skip ALBs in Phase A, direct EC2 access for validation

### File Structure
```
local-task-app/
├── frontend/
│   ├── src/
│   │   ├── App.jsx           (Main component, handles API calls)
│   │   ├── components/
│   │   │   ├── TaskForm.jsx  (Create task)
│   │   │   ├── TaskList.jsx  (List + refresh)
│   │   │   └── TaskCard.jsx  (Edit/delete/status)
│   │   └── main.jsx          (Entry point)
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── server.js         (Express setup)
│   │   ├── db.js             (pg Pool connection)
│   │   ├── tasksRouter.js    (CRUD endpoints)
│   │   └── migrate.js        (Database migrations)
│   ├── migrations/
│   │   └── 001_create_tasks_table.sql
│   ├── package.json
│   └── .env                  (DB config)
│
├── package.json              (Root: concurrently dev runner)
├── GUIDE.md                  (This file)
├── AWS_DEPLOYMENT.md         (Quick overview and architecture)
└── AWS_COMPLETE_DEPLOYMENT.md (Complete step-by-step guide for all 8 requirements)
```

---

## Troubleshooting

### "Cannot connect to database"
**Problem**: Backend shows `ECONNREFUSED` on port 5432  
**Solution**:
```powershell
docker ps | Select-String task-postgres
# If not running:
docker run -d --name task-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=taskdb `
  -p 5432:5432 `
  postgres:15-alpine
```

### "Port 3000 already in use"
**Problem**: `EADDRINUSE: address already in use :::3000`  
**Solution**:
```bash
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
# Then retry: npm run dev
```

### "Port 5173 is in use"
**Problem**: Vite trying multiple ports (5173-5176)  
**Solution**: Multiple dev servers already running. Close extra terminals or:
```bash
# Stop all Node processes
npm run dev  # Will auto-pick next available port
```

### "Migrations failed"
**Problem**: `Error: connect ECONNREFUSED`  
**Solution**: Ensure PostgreSQL is running first:
```powershell
docker ps | Select-String postgres
# If stopped:
docker start task-postgres
Start-Sleep -Seconds 2
node src/migrate.js
```

### Frontend can't reach API
**Problem**: 404 or CORS errors in browser console  
**Solution**:
1. Verify backend running: `curl http://localhost:3000/api/tasks`
2. Check browser console for exact error
3. Ensure CORS is enabled on backend (it is by default)

### Database shows old data after restart
**Normal behavior**: Docker containers don't persist data by default. To keep data:
```powershell
docker run -d --name task-postgres `
  ...existing flags... `
  -v postgres-data:/var/lib/postgresql/data `
  postgres:15-alpine
```

---

## Environment Variables

### Backend (.env)
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=taskdb
DB_PORT=5432
DB_SSL=false
PORT=3000
NODE_ENV=development
```

For AWS RDS, update:
```env
DB_HOST=your-rds-endpoint.eu-west-1.rds.amazonaws.com
DB_SSL=true
# Keep username, password, DB_NAME same
```

---

## Next Steps

1. ✅ **Local development**: You're here!
2. 📦 **AWS Deployment**: Follow [AWS_BUDGET_DEPLOYMENT.md](AWS_BUDGET_DEPLOYMENT.md)
3. 📊 **Monitoring**: Set up CloudWatch logs and alarms
4. 🔐 **Security**: Configure WAF, Secrets Manager, IAM roles

---

## Support & Resources

- [Express.js Docs](https://expressjs.com/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [AWS EC2 Docs](https://docs.aws.amazon.com/ec2/)
- [Docker Docs](https://docs.docker.com/)

---

**Last Updated**: December 23, 2025  
**Status**: Ready for local testing and AWS deployment
