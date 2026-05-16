# CampusCare API Documentation

This document outlines the backend API endpoints for the CampusCare application. The backend is built with Node.js, Express, and PostgreSQL.

---

## Base URL
All API endpoints are relative to:
`http://<host>:<port>/api`
(e.g., `http://localhost:3000/api`)

## Authentication
Most routes are protected and require a JSON Web Token (JWT) in the `Authorization` header.

**Header Format:**
```
Authorization: Bearer <your_jwt_token>
```

Roles available in the system:
*   `community_member`
*   `facility_manager`
*   `worker`
*   `admin`

---

## 1. Authentication Routes

### Register a User
*   **Method:** `POST`
*   **URL:** `/auth/register`
*   **Authentication:** None (Public)
*   **Description:** Creates a new user account.

**Request Body:**
```json
{
  "email": "student@university.edu",       // string, required
  "password": "securepassword123",         // string, required (min 8 chars)
  "role": "community_member"               // string, optional (defaults to community_member)
}
```

**Example Request:**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "securepassword123",
  "role": "community_member"
}
```

**Success Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "user": {
    "id": 1,
    "email": "student@university.edu",
    "role": "community_member"
  }
}
```

**Error Responses:**
*   `400 Bad Request`: `{ "message": "Email and password are required." }` or `{ "message": "Password must be at least 8 characters." }`
*   `409 Conflict`: `{ "message": "Email already registered." }`

---

### Login User
*   **Method:** `POST`
*   **URL:** `/auth/login`
*   **Authentication:** None (Public)
*   **Description:** Authenticates a user and returns a JWT.

**Request Body:**
```json
{
  "email": "student@university.edu",       // string, required
  "password": "securepassword123"          // string, required
}
```

**Example Request:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "securepassword123"
}
```

**Success Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5c...",
  "user": {
    "id": 1,
    "email": "student@university.edu",
    "role": "community_member"
  }
}
```

**Error Response (401 Unauthorized):**
```json
{
  "message": "Invalid email or password."
}
```

---

### Logout User
*   **Method:** `POST`
*   **URL:** `/auth/logout`
*   **Authentication:** Required (Any role)
*   **Description:** Confirms session end. (Client must discard the token).

**Example Request:**
```http
POST /api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

**Success Response (200 OK):**
```json
{
  "message": "Logged out successfully."
}
```

---

## 2. Issues Routes

### Create a New Issue
*   **Method:** `POST`
*   **URL:** `/issues`
*   **Authentication:** Required (`community_member` only)
*   **Description:** Submits a new campus maintenance issue.

**Request Body:**
```json
{
  "title": "Broken light",                 // string, optional
  "description": "The fluorescent light is flickering.", // string, required
  "category": "Electrical",                // string, required (Electrical, Plumbing, Cleaning, Furniture, Other)
  "building": "Library",                   // string, required
  "floor": "2nd",                          // string, optional
  "room": "204",                           // string, optional
  "image_url": "https://..."               // string, optional
}
```

**Example Request:**
```http
POST /api/issues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
Content-Type: application/json

{
  "title": "Broken light",
  "description": "The fluorescent light is flickering.",
  "category": "Electrical",
  "building": "Library",
  "floor": "2nd",
  "room": "204"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "issue": {
    "id": 15,
    "user_id": 1,
    "title": "Broken light",
    "description": "The fluorescent light is flickering.",
    "category": "Electrical",
    "building": "Library",
    "floor": "2nd",
    "room": "204",
    "image_url": null,
    "status": "Pending",
    "created_at": "2023-10-25T14:30:00Z",
    "updated_at": "2023-10-25T14:30:00Z"
  },
  "data": { ... } // formatted version of the issue
}
```

**Error Response (400 Bad Request):**
```json
{
  "message": "Category is required and must be one of the allowed values.",
  "errors": ["Category is required and must be one of the allowed values."]
}
```

---

### Get All Issues
*   **Method:** `GET`
*   **URL:** `/issues`
*   **Authentication:** Required (`facility_manager` or `admin` only)
*   **Description:** Retrieves all issues in the system, with optional filtering and sorting.

**Query Parameters:**
*   `status` (optional): "Pending", "In Progress", "Resolved", or "all"
*   `category` (optional): e.g., "Electrical", "all"
*   `search` (optional): Keyword to search title, description, building, etc.
*   `sortBy` (optional): "status", "date", or "category"
*   `sortOrder` (optional): "ASC" or "DESC"

**Example Request:**
```http
GET /api/issues?status=Pending&category=Electrical&sortBy=date&sortOrder=DESC
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 15,
      "title": "Broken light",
      "description": "The fluorescent light is flickering.",
      "category": "Electrical",
      "location": "Library, 2nd, 204",
      "status": "Pending",
      "reportedBy": 1,
      "assignedWorkerId": null,
      "createdAt": "2023-10-25T14:30:00Z",
      "updatedAt": "2023-10-25T14:30:00Z",
      "resolvedAt": null,
      "photoUrl": null
    }
  ],
  "filters": { ... }
}
```

---

### Get My Submitted Issues
*   **Method:** `GET`
*   **URL:** `/issues/my`
*   **Authentication:** Required (`community_member` only)
*   **Description:** Retrieves issues reported by the currently authenticated user.

**Example Request:**
```http
GET /api/issues/my
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [ ... array of formatted issue objects ... ]
}
```

---

### Get Worker's Assigned Issues
*   **Method:** `GET`
*   **URL:** `/issues/assigned`
*   **Authentication:** Required (`worker` only)
*   **Description:** Retrieves issues assigned to the currently authenticated worker.

**Example Request:**
```http
GET /api/issues/assigned
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 1,
  "data": [ ... array of formatted issue objects ... ]
}
```

---

### Get Issue Details
*   **Method:** `GET`
*   **URL:** `/issues/:id`
*   **Authentication:** Required (User must own the issue, be assigned to it, or be a manager/admin)
*   **Description:** Fetches full details for a specific issue, including photos and comments.

**Example Request:**
```http
GET /api/issues/15
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 15,
    "title": "Broken light",
    "description": "The fluorescent light is flickering.",
    "category": "Electrical",
    "location": "Library, 2nd, 204",
    "status": "Pending",
    "reportedBy": 1,
    "assignedWorkerId": null,
    "createdAt": "...",
    "updatedAt": "...",
    "photos": [],
    "comments": []
  }
}
```

---

### Update Issue Status
*   **Method:** `PUT`
*   **URL:** `/issues/:id/status`
*   **Authentication:** Required (`facility_manager`, `admin`, or assigned `worker`)
*   **Description:** Updates the status of an issue. Workers can only change status to "In Progress".

**Request Body:**
```json
{
  "status": "In Progress"                  // string, required ("Pending", "In Progress", "Resolved")
}
```

**Example Request:**
```http
PUT /api/issues/15/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
Content-Type: application/json

{
  "status": "In Progress"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Issue status updated.",
  "data": { ... updated formatted issue object ... }
}
```

---

### Assign Issue to Worker
*   **Method:** `PUT`
*   **URL:** `/issues/:id/assign`
*   **Authentication:** Required (`facility_manager` or `admin`)
*   **Description:** Assigns an issue to a specific worker.

**Request Body:**
```json
{
  "workerId": 5                            // integer, required
}
```

**Example Request:**
```http
PUT /api/issues/15/assign
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
Content-Type: application/json

{
  "workerId": 5
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Issue assigned.",
  "data": { ... updated formatted issue object ... }
}
```

---

### Close Issue
*   **Method:** `PUT`
*   **URL:** `/issues/:id/close`
*   **Authentication:** Required (`facility_manager` or `admin`)
*   **Description:** Closes an issue (marks as Resolved). Issue must currently be Resolved.

**Example Request:**
```http
PUT /api/issues/15/close
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Resolved issue closed.",
  "data": { ... updated formatted issue object ... }
}
```

---

### Add Comment to Issue
*   **Method:** `POST`
*   **URL:** `/issues/:id/comments`
*   **Authentication:** Required (Assigned `worker` only)
*   **Description:** Allows a worker to add progress comments to their assigned issue.

**Request Body:**
```json
{
  "text": "Replaced the ballast, testing now." // string, required
}
```

**Example Request:**
```http
POST /api/issues/15/comments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
Content-Type: application/json

{
  "text": "Replaced the ballast, testing now."
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Comment added.",
  "data": {
    "id": 1,
    "workerId": 5,
    "text": "Replaced the ballast, testing now.",
    "createdAt": "..."
  }
}
```

---

### Delete Issue
*   **Method:** `DELETE`
*   **URL:** `/issues/:id`
*   **Authentication:** Required (`facility_manager` or `admin`)
*   **Description:** Deletes an issue entirely from the system.

**Example Request:**
```http
DELETE /api/issues/15
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Issue deleted."
}
```

---

## 3. Admin Routes

### Get All Users
*   **Method:** `GET`
*   **URL:** `/admin/users`
*   **Authentication:** Required (`admin` only)
*   **Description:** Retrieves a list of all users in the system.

**Example Request:**
```http
GET /api/admin/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "count": 10,
  "statusSupported": true,
  "users": [
    {
      "id": 1,
      "email": "admin@university.edu",
      "role": "admin",
      "status": "active"
    }
  ]
}
```

---

### Update User Status
*   **Method:** `PUT`
*   **URL:** `/admin/users/:id/status`
*   **Authentication:** Required (`admin` only)
*   **Description:** Activates or deactivates a user account.

**Request Body:**
```json
{
  "status": "inactive"                     // string, required ("active" or "inactive")
}
```

**Example Request:**
```http
PUT /api/admin/users/2/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5c...
Content-Type: application/json

{
  "status": "inactive"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User status updated.",
  "user": {
    "id": 2,
    "email": "worker@university.edu",
    "role": "worker",
    "status": "inactive"
  }
}
```
