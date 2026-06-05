require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('./db');

async function initDatabase() {
  console.log('Initializing database...');

  const schemaStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      username    VARCHAR(255) UNIQUE NOT NULL,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password    VARCHAR(255) NOT NULL,
      bio         TEXT,
      avatar_url  TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS posts (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      content     TEXT NOT NULL,
      image_url   TEXT,
      is_edited   BOOLEAN DEFAULT 0,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      post_id     INT NOT NULL,
      user_id     INT NOT NULL,
      content     TEXT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS likes (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      post_id     INT NOT NULL,
      user_id     INT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_like (post_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS follows (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      follower_id INT NOT NULL,
      followee_id INT NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_follow (follower_id, followee_id),
      CHECK(follower_id != followee_id)
    )`,
    `CREATE INDEX idx_posts_user_id ON posts(user_id)`,
    `CREATE INDEX idx_posts_created_at ON posts(created_at)`,
    `CREATE INDEX idx_comments_post_id ON comments(post_id)`,
    `CREATE INDEX idx_likes_post_id ON likes(post_id)`,
    `CREATE INDEX idx_follows_follower ON follows(follower_id)`,
    `CREATE INDEX idx_follows_followee ON follows(followee_id)`
  ];

  for (const statement of schemaStatements) {
    try {
      await db.asyncRun(statement);
    } catch (e) {
      // Ignore index already exists errors
      if (e.code !== 'ER_DUP_KEYNAME') {
        throw e;
      }
    }
  }

  console.log('[OK] Database tables created successfully.');

  // Check if demo users already exist to avoid re-seeding
  const existing = await db.asyncGet("SELECT id FROM users WHERE username = 'marcus_v'");
  if (existing) {
    console.log('[OK] Demo data already present. Skipping seed.');
    process.exit(0);
  }

  console.log('Seeding initial demo data...');
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash('password123', 10);

  // Seed Users — no explicit IDs, let autoincrement assign them
  const r1 = await db.asyncRun(
    'INSERT INTO users (username, email, password, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
    ['marcus_v', 'marcus@nexus.com', hashed, 'Tech builder, designer, and writer.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150']
  );
  const r2 = await db.asyncRun(
    'INSERT INTO users (username, email, password, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
    ['sarah_j', 'sarah@nexus.com', hashed, 'Visual artist and photographer. Sharing moments from daily walks.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150']
  );
  const r3 = await db.asyncRun(
    'INSERT INTO users (username, email, password, bio, avatar_url) VALUES (?, ?, ?, ?, ?)',
    ['alex_travels', 'alex@nexus.com', hashed, 'Adventure seeker, capturing landscapes and stories from around the globe.', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150']
  );

  // Use the actual auto-generated IDs
  const marcusId = r1.lastID;
  const sarahId  = r2.lastID;
  const alexId   = r3.lastID;

  console.log(`[OK] Demo users created: marcus_v(${marcusId}), sarah_j(${sarahId}), alex_travels(${alexId})`);

  // Seed Posts
  const p1 = await db.asyncRun(
    'INSERT INTO posts (user_id, content, image_url, created_at) VALUES (?, ?, ?, ?)',
    [marcusId, 'Just finished assembling my minimal mechanical keyboard. The sound of copper switches is therapeutic.', 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800', '2026-06-05T10:00:00']
  );
  const p2 = await db.asyncRun(
    'INSERT INTO posts (user_id, content, image_url, created_at) VALUES (?, ?, ?, ?)',
    [sarahId, 'Stunning foggy sunrise during my early morning walk today. Nature never ceases to inspire.', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800', '2026-06-05T11:00:00']
  );
  const p3 = await db.asyncRun(
    'INSERT INTO posts (user_id, content, image_url, created_at) VALUES (?, ?, ?, ?)',
    [alexId, 'Currently exploring a remote village high in the mountains. The air here is thin but the hospitality is immense.', '', '2026-06-05T12:00:00']
  );

  const post1 = p1.lastID;
  const post2 = p2.lastID;
  const post3 = p3.lastID;

  // Seed Likes
  await db.asyncRun('INSERT IGNORE INTO likes (post_id, user_id) VALUES (?, ?)', [post1, sarahId]);
  await db.asyncRun('INSERT IGNORE INTO likes (post_id, user_id) VALUES (?, ?)', [post1, alexId]);
  await db.asyncRun('INSERT IGNORE INTO likes (post_id, user_id) VALUES (?, ?)', [post2, marcusId]);
  await db.asyncRun('INSERT IGNORE INTO likes (post_id, user_id) VALUES (?, ?)', [post3, sarahId]);

  // Seed Comments
  await db.asyncRun(
    'INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
    [post1, sarahId, 'That keyboard looks clean! Which keycaps did you use?', '2026-06-05T10:15:00']
  );
  await db.asyncRun(
    'INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
    [post1, alexId, 'Copper switches are an excellent choice. The minimal layout looks stunning.', '2026-06-05T10:20:00']
  );
  await db.asyncRun(
    'INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
    [post2, marcusId, 'Incredible lighting. Wish I was awake early enough to witness this.', '2026-06-05T11:30:00']
  );
  await db.asyncRun(
    'INSERT INTO comments (post_id, user_id, content, created_at) VALUES (?, ?, ?, ?)',
    [post3, marcusId, 'The mountains there are breathtaking. Stay safe on your travels.', '2026-06-05T12:45:00']
  );

  // Seed Follows
  await db.asyncRun('INSERT IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)', [marcusId, sarahId]);
  await db.asyncRun('INSERT IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)', [sarahId, marcusId]);
  await db.asyncRun('INSERT IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)', [alexId, marcusId]);
  await db.asyncRun('INSERT IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)', [alexId, sarahId]);

  console.log('[OK] Seeding completed successfully.');
  process.exit(0);
}

initDatabase().catch((err) => {
  console.error('[ERROR] Failed to initialize database:', err.message);
  process.exit(1);
});
