# 🏫 CampusCare

> A mobile application for university campus facility management — enabling users to report maintenance issues and track their resolution in real time.

[![JavaScript](https://img.shields.io/badge/JavaScript-99.9%25-F7DF1E?logo=javascript&logoColor=black)](#)
[![React Native](https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react)](#)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js&logoColor=white)](#)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](#)
[![Expo](https://img.shields.io/badge/Expo-SDK_54-000020?logo=expo)](#)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker&logoColor=white)](#)

---

## 📑 Table of Contents

- [Overview](#overview)
- [Team Members](#team-members)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [API Endpoints](#api-endpoints)
- [User Roles](#user-roles)
- [Environment Variables](#environment-variables)
- [Docker Deployment](#docker-deployment)
- [Key Requirements](#key-requirements)
- [License](#license)

---

## Overview

**CampusCare** streamlines facility maintenance on university campuses. Students and staff can submit maintenance requests (broken fixtures, plumbing, electrical issues, etc.) through a mobile app. Facility managers review, assign, and track these issues, while maintenance workers receive and act on their assigned tasks — all in real time.

---

## 👥 Team Members

| Name | Role |
|------|------|
| Mostafa Amer | Developer |
| Youssef Tamer | Developer |
| Mohamed Haitham | Developer |
| Nariman Sherif | Developer |
| Habiba Elwi | Developer |
| Hla Ezzeldin | Developer |
| Vania Abdelghafar | Developer |
| Israa Hagag | Developer |

---

## ✨ Features

- **User Authentication** — Signup, login, and logout with JWT-based token security
- **Issue Reporting** — Submit maintenance issues with location, photo upload, category, and description
- **Real-Time Issue Tracking** — Track issues through status lifecycle: `Pending → In Progress → Resolved`
- **Facility Manager Dashboard** — Review all submitted issues, assign workers, and monitor progress
- **Worker Interface** — View and manage assigned maintenance tasks
- **Admin Panel** — Full administrative control including user management
- **Community Dashboard** — Browse all campus issues and their current status
- **Photo Attachments** — Upload images (up to 12 MB) to visually document issues
- **Role-Based Access Control** — Different views and permissions for each user role

---

## 🛠 Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo | SDK 54 | Development toolchain & build system |
| React Navigation | 7.x | Screen navigation (native stack) |
| Axios | 1.16.0 | HTTP client for API requests |
| Expo Image Picker | 17.x | Camera & gallery photo selection |
| AsyncStorage | 2.2.0 | Local token/session persistence |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Server runtime |
| Express | 5.2.1 | Web framework & REST API |
| PostgreSQL | — | Relational database |
| bcrypt | 6.0.0 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT authentication |
| Helmet | 8.1.0 | HTTP security headers |
| Morgan | 1.10.1 | Request logging |
| CORS | 2.8.6 | Cross-origin resource sharing |
| dotenv | 17.4.2 | Environment variable management |

---

## 📁 Project Structure Overview

The CampusCare repository is divided into two primary directories: **`frontend`** (the mobile application) and **`backend`** (the API and database infrastructure). Below is a detailed breakdown of the key directories and files within each.

### Backend Architecture

The backend is built as a RESTful API using Node.js and Express, following an MVC-like routing pattern.

*   **`backend/config/`**: Contains core configuration files, most notably `db.js`, which establishes and manages the connection pool to the PostgreSQL database.
*   **`backend/controllers/`**: Houses the core business logic. For example, `authController.js` handles the complex logic of hashing passwords, validating user credentials, and signing JWT tokens before sending responses back to the routes.
*   **`backend/middleware/`**: Contains interceptor functions that run before a request reaches the route handler. `authMiddleware.js` is critical here, containing functions to verify JWTs (`authenticate`) and enforce role-based access control (`requireRole`).
*   **`backend/routes/`**: Defines the API endpoints. It is modularized by feature (e.g., `authRoutes.js`, `issueRoutes.js`, `adminRoutes.js`). These files map specific HTTP methods and URL paths to their corresponding controllers and middleware.
*   **`backend/sql/`**: Contains database schemas and migration scripts. `issues_schema.sql` defines the structural blueprint for the PostgreSQL tables (users, issues, etc.).
*   **`backend/app.js` & `server.js`**: `app.js` sets up the Express application, applies global middleware (like CORS and Helmet), and mounts the route handlers. `server.js` is the main entry point that binds the app to a network port and starts the server.

### Frontend Architecture

The frontend is a React Native mobile application built using the Expo framework.

*   **`frontend/navigation/`**: Manages the routing between different screens in the app using React Navigation. It controls the stack and tab navigators that allow users to move smoothly through the application.
*   **`frontend/screens/`**: The core UI components of the application. Each file represents a full page in the app. This is further organized by feature:
    *   **Dashboards**: Role-specific landing pages (`AdminDashboard.js`, `ManagerDashboard.js`, `WorkerDashboard.js`, `CommunityDashboard.js`).
    *   **Issue Management**: Screens for creating and interacting with issues (`SubmitIssue/`, `IssueDetailsScreen.js`, `AssignIssueScreen.js`).
    *   **Authentication**: User onboarding (`LoginScreen.js`, `RegisterScreen.js`).
*   **`frontend/services/`**: The data-fetching layer. This directory contains utility functions that use `Axios` to make HTTP requests to the backend API, separating API logic from UI components.
*   **`frontend/App.js` & `index.js`**: The root components that initialize the React Native application, load necessary providers, and render the primary navigation stack.
*   **`frontend/app.json`**: The Expo configuration file defining app metadata, icons, splash screens, and required device permissions (like camera access).

---

## 📋 Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** ≥ 14.x (running locally or remote)
- **Expo CLI** — `npm install -g expo-cli`
- **Expo Go** app on your phone (for mobile testing)
- **Docker** (optional, for containerized backend deployment)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mosamer5267-code/SRS-Project.git
cd SRS-Project
```

### 2. Set Up the Database

1. Go to https://supabase.com and create a free account
2. Create a new project and wait for it to initialize
3. Go to the SQL Editor in your Supabase dashboard
4. Copy and paste the contents of backend/sql/issues_schema.sql and run it
5. Go to Project Settings → Database and copy your 
   connection string into DATABASE_URL in your .env file

### 3. Configure Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
PORT=3000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
JWT_SECRET=your_jwt_secret_key
```

### 4. Start the Backend

```bash
cd backend
npm install
npm start
```

The API server will start on `http://localhost:3000`. Verify with:

```bash
curl http://localhost:3000/api/health
# Expected: {"status":"OK"}
```

### 5. Start the Frontend

```bash
cd frontend
npm install
npm start
```

This launches Expo — scan the QR code with the **Expo Go** app on your device, or press:
- `a` — open on Android emulator
- `i` — open on iOS simulator
- `w` — open in web browser

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/login` | User login (returns JWT) |
| `GET` | `/api/issues` | List all issues |
| `POST` | `/api/issues` | Create a new issue |
| `GET` | `/api/worker` | Worker assigned tasks |
| `PUT` | `/api/worker` | Update task status |
| `GET` | `/api/admin` | Admin dashboard data |
| `POST` | `/api/admin` | Admin operations |

> **Note:** Most endpoints require a valid JWT token in the `Authorization: Bearer <token>` header.

---

## 👤 User Roles

| Role | Permissions |
|------|-------------|
| **Community Member** | Report issues, view own issues, browse community dashboard |
| **Facility Manager** | All community permissions + assign issues to workers, view all issues |
| **Worker** | View assigned issues, update issue status (In Progress / Resolved) |
| **Admin** | Full system access — manage users, view dashboards, all CRUD operations |

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret key for signing JWT tokens | — |

---

## 🐳 Docker Deployment

The backend includes a `Dockerfile` for containerized deployment:

```bash
cd backend

# Build the image
docker build -t campuscare-backend .

# Run the container
docker run -p 3000:3000 --env-file .env campuscare-backend
```

**Dockerfile summary:**
- Base image: `node:18`
- Exposes port `3000`
- Entry point: `node server.js`

---

## 📌 Key Requirements

- ✅ Role-based access control (RBAC) for all user types
- ✅ Real-time issue tracking with status updates
- ✅ Fast performance — target response time under 3 seconds
- ✅ Support for concurrent multiple users
- ✅ Secure authentication with bcrypt password hashing + JWT tokens
- ✅ HTTP security hardening via Helmet
- ✅ Photo upload support (up to 12 MB per request)

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  <i>Built with ❤️ by the CampusCare team</i>
</p>
