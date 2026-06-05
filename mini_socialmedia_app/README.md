# Nexus - Mini Social Media Application

Nexus is a lightweight, full-stack social media application featuring user authentication, user profiles, posts, likes, comments, and a follow-based home feed.

## Architecture

The project consists of a detached client-server model:
- **Backend**: An Express.js REST API using SQLite for storage.
- **Frontend**: A multi-page vanilla HTML/CSS/JS frontend styled using Tailwind CSS, communicating with the backend REST API via standard HTTP fetch requests.

## Project Structure

```
codealpha_mini_socialmedia_app/
├── DOCS/               - Product requirements and architectural documentation
├── backend/            - Node.js & Express.js REST API
│   ├── server.js       - Server entrypoint
│   ├── .env            - Environment configuration
│   ├── package.json    - Dependencies and scripts
│   ├── database/
│   │   ├── db.js       - SQLite client setup (sqlite3 Verbose driver)
│   │   └── init.js     - Database schema creation script
│   ├── middleware/
│   │   └── auth.js     - JWT authorization middleware
│   └── routes/
│       ├── auth.js     - Authentication routes (Register, Login)
│       ├── users.js    - User profile and relationship routes (Follow/Unfollow)
│       └── posts.js    - Posts, likes, and comment routes
├── frontend/           - Frontend multi-page client application
│   ├── index.html      - Home feed page
│   ├── explore.html    - Explore feed page
│   ├── profile.html    - User profile page
│   ├── edit_profile.html - Profile edit form
│   ├── login.html      - Authentication login page
│   ├── register.html   - Authentication registration page
│   ├── post.html       - Single post detail and comments page
│   └── api.js          - Fetch wrapper API client
└── database/           - Database schema specifications
    └── README.md
```

## Quick Start

### 1. Install Backend Dependencies
Run the following commands to install dependencies:
```bash
cd backend
npm install
```

### 2. Initialize the Database
Run the schema setup script:
```bash
npm run init-db
```

### 3. Start the API Server
Start the development server:
```bash
npm run dev
```
The API server listens at `http://127.0.0.1:3000/api`.

### 4. Serve the Frontend
Open the `frontend/` directory using any static web server (such as Live Server in VS Code) or serve it using local serving tools.
The frontend connects to the API server via `http://127.0.0.1:3000/api`.

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register a new user |
| POST | /api/auth/login | No | User authentication |
| GET | /api/users/:username | Yes | Retrieve profile details |
| PUT | /api/users/:username | Yes | Edit current user profile details |
| GET | /api/users/:username/followers | Yes | Retrieve a list of followers |
| GET | /api/users/:username/following | Yes | Retrieve a list of followed users |
| POST | /api/users/:username/follow | Yes | Follow a user |
| DELETE | /api/users/:username/follow | Yes | Unfollow a user |
| GET | /api/posts/feed | Yes | Retrieve chronological feed (own posts and followed users) |
| GET | /api/posts/explore | Yes | Retrieve chronological feed of all posts |
| POST | /api/posts | Yes | Create a new post |
| GET | /api/posts/:id | Yes | Retrieve a single post |
| PUT | /api/posts/:id | Yes | Edit a post |
| DELETE | /api/posts/:id | Yes | Delete a post |
| POST | /api/posts/:id/like | Yes | Like a post |
| DELETE | /api/posts/:id/like | Yes | Unlike a post |
| GET | /api/posts/:id/comments | Yes | Retrieve post comments |
| POST | /api/posts/:id/comments | Yes | Create a comment |
| DELETE | /api/posts/comments/:id | Yes | Delete a comment |
