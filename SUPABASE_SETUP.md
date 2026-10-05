# Supabase Setup Guide

This backend now uses **Supabase (PostgreSQL)** instead of MongoDB.

## 1. Create Supabase Project

1. Go to https://supabase.com and sign up
2. Create a new project
3. Get your credentials from Project Settings > API:
   - `SUPABASE_URL`: Your project URL
   - `SUPABASE_ANON_KEY`: Your anon/public key

## 2. Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Open the file `supabase_schema.sql` from this project
3. Run the SQL script to create all tables:
   - `users`
   - `projects`
   - `tasks`

## 3. Configure Environment Variables

Update your `.env` file:

```env
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
NODE_ENV=development
```

## 4. Run Seed Script

Create default admin and member users:

```bash
npm run seed
```

**Login Credentials:**
- Admin: `admin@taskflow.com` / `admin123`
- Member: `member@taskflow.com` / `member123`

## 5. Start Server

```bash
npm run dev
```

## API Endpoints (Unchanged)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `GET /api/auth/users` - Get all users (admin only)
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get single project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get single task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/dashboard/stats` - Get dashboard stats

## Database Schema

### users
- id (UUID, primary key)
- name (text)
- email (text, unique)
- password (text)
- role (enum: admin/member)
- avatar (text)
- created_at (timestamp)

### projects
- id (UUID, primary key)
- name (text)
- description (text)
- status (enum: active/completed/archived)
- user_id (UUID, foreign key to users)
- members (UUID array)
- color (text)
- created_at (timestamp)
- updated_at (timestamp)

### tasks
- id (UUID, primary key)
- title (text)
- description (text)
- status (enum: todo/in-progress/review/done)
- priority (enum: low/medium/high)
- due_date (timestamp)
- project_id (UUID, foreign key to projects)
- assignee_id (UUID, foreign key to users, nullable)
- created_by (UUID, foreign key to users)
- tags (text array)
- created_at (timestamp)
- updated_at (timestamp)
