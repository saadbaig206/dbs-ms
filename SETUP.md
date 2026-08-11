# SETUP.md - Med-Spa Clinic Management System

This guide outlines how to set up the Postgres database (Neon), run backend migrations, seed the initial dataset, run the frontend and backend locally, and how the role-based auth system works.

---

## 1. Neon Database Setup

1. Sign up/log in at [Neon Console](https://console.neon.tech/).
2. Create a new project named e.g., `aura-clinic`.
3. In the **Connection Details** section, copy the Connection String. Choose the **Postgres** option with `asyncpg` or select standard connection string.
4. Replace standard Postgres prefix `postgresql://` with the asyncpg driver prefix:
   - Direct/pooled URL: `postgresql+asyncpg://<user>:<password>@<host>/<dbname>?sslmode=require`
5. Place this connection string inside your `.env` configuration file under `DATABASE_URL`.

---

## 2. Running Locally

### Option A: Local Dev Server

1. **Backend setup**:
   - Ensure Python 3.12+ is installed.
   - Navigate to `/backend`.
   - Install dependencies: `pip install -r requirements.txt`
   - Database tables are created dynamically on application startup.
   - Start the FastAPI server:
     ```bash
     uvicorn app.main:app --reload
     ```
   - OpenAPI Swagger docs will be available at: `http://localhost:8000/docs`.

2. **Frontend setup**:
   - Ensure Node.js 18+ is installed.
   - Install dependencies: `npm install`
   - Start Next.js development server:
     ```bash
     npm run dev
     ```
   - App will be running at `http://localhost:3000`.

### Option B: Docker Compose

Simply configure your Neon database credentials in `.env` and run the following command from the root directory:
```bash
docker-compose up --build
```
This boots up the FastAPI backend and Next.js frontend concurrently.

---

## 3. How Auth & Roles Work End-to-End

1. **Login API (`/auth/login`)**:
   - User enters credentials.
   - Client sends credentials to Next.js route handler (`/api/auth/login`), which forwards them to FastAPI.
   - FastAPI verifies password using `bcrypt` and returns access + refresh JWTs and role.
   - Next.js route handler writes these JWTs to secure `HttpOnly` cookies.
2. **Access Control (`proxy.ts`)**:
   - On every request, Next.js Edge proxy checks for the presence of the `access_token` cookie.
   - If missing, it redirects unauthenticated users to `/login`.
   - Admin-only routes (e.g. `/expenses`, `/finance`, `/dashboard`) are protected: if the `user_role` cookie is not `admin`, the proxy redirects the user back to the staff POS screen.
