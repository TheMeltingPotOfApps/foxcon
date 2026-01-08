# SMS SaaS Platform

Multi-tenant SMS AI SaaS platform built with NestJS, Next.js, PostgreSQL, Redis, RabbitMQ, and Twilio.

## Prerequisites

- Node.js 18+ (20+ recommended)
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3.12+
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Services with Docker

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- RabbitMQ on port 5672 (Management UI on 15672)

The database `sms_platform` and user `sms_user` will be created automatically.

### 3. Set Up Environment Variables

- Copy `.env.example` files in backend and frontend directories
- Fill in required values:
  - Backend: `backend/.env`
  - Frontend: `frontend/.env.local`

### 4. Start Development Servers

**Option 1: Using scripts (Recommended)**
```bash
./start.sh      # Start both servers
./restart.sh    # Restart both servers
./stop.sh       # Stop both servers
```

**Option 2: Manual start**
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

This will start:
- Backend API on http://localhost:5000
- Frontend app on http://localhost:5001

## Development Workflow

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both projects for production
- `./start.sh` - Start both servers
- `./restart.sh` - Restart both servers
- `./stop.sh` - Stop both servers

## Project Structure

```
SMS/
├── backend/          # NestJS backend API
├── frontend/         # Next.js frontend app
├── docker-compose.yml # Docker services configuration
├── start.sh          # Start servers script
├── restart.sh        # Restart servers script
└── stop.sh           # Stop servers script
```

## API Endpoints

- Backend API: http://localhost:5000/api
- Frontend: http://localhost:5001

## Logs

- Backend logs: `/tmp/backend.log` or `tail -f /tmp/backend.log`
- Frontend logs: `/tmp/frontend.log` or `tail -f /tmp/frontend.log`

## Features

- ✅ Multi-tenant architecture
- ✅ JWT authentication
- ✅ Campaign management
- ✅ Contact management
- ✅ Conversations inbox
- ✅ Twilio integration
- ✅ AI-powered replies (Claude)
- ✅ Template system
- ✅ Real-time dashboard

## Troubleshooting

### Port Already in Use
If ports 5000 or 5001 are already in use:
```bash
./stop.sh    # Stop existing servers
./start.sh   # Start fresh
```

### Database Connection Issues
Ensure PostgreSQL is running:
```bash
docker-compose ps
docker-compose up -d postgres
```

### View Logs
```bash
# Backend
tail -f /tmp/backend.log

# Frontend
tail -f /tmp/frontend.log
```
