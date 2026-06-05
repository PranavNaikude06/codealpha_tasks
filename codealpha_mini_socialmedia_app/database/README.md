# Database Configuration

This folder details the SQLite database structure and setup scripts.

## File Registry

| File | Purpose |
|------|---------|
| `db.js` | Database client connection wrapper using the sqlite3Verbose engine. |
| `init.js` | Database schema initialization script generating core tables and indices. |
| `nexus.db` | Auto-generated local SQLite database file (ignored by version control). |

## Initialization

Run the initialization script from the backend directory:

```bash
npm run init-db
```

## Schema Reference

### users
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Primary Key, Auto-increment |
| username | TEXT UNIQUE | 3 to 30 characters |
| email | TEXT UNIQUE | Validated email address |
| password | TEXT | Hashed password via Bcrypt |
| bio | TEXT | Optional user biography |
| avatar_url | TEXT | Optional profile image URL |
| created_at | DATETIME | Timestamp of registration |

### posts
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Primary Key |
| user_id | INTEGER FK | Foreign Key pointing to users.id (ON DELETE CASCADE) |
| content | TEXT | Post body (up to 500 characters) |
| image_url | TEXT | Optional post attachment image URL |
| is_edited | INTEGER | Flag specifying edit state (0 or 1) |
| created_at | DATETIME | Timestamp of creation |
| updated_at | DATETIME | Timestamp of last modification |

### comments
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Primary Key |
| post_id | INTEGER FK | Foreign Key pointing to posts.id (ON DELETE CASCADE) |
| user_id | INTEGER FK | Foreign Key pointing to users.id (ON DELETE CASCADE) |
| content | TEXT | Comment body (up to 300 characters) |
| created_at | DATETIME | Timestamp of creation |

### likes
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Primary Key |
| post_id | INTEGER FK | Foreign Key pointing to posts.id (ON DELETE CASCADE) |
| user_id | INTEGER FK | Foreign Key pointing to users.id (ON DELETE CASCADE) |
| created_at | DATETIME | Timestamp of creation |
| UNIQUE | (post_id, user_id) | Ensures constraint of one like per user per post |

### follows
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | Primary Key |
| follower_id | INTEGER FK | Foreign Key pointing to users.id (ON DELETE CASCADE) |
| followee_id | INTEGER FK | Foreign Key pointing to users.id (ON DELETE CASCADE) |
| created_at | DATETIME | Timestamp of relationship creation |
| UNIQUE | (follower_id, followee_id) | Prevents duplicate follow relations |
| CHECK | follower_id != followee_id | Prevents a user from following themselves |
