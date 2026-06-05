const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── Helper: enrich a post row with author + counts + is_liked ──
async function enrichPost(post, currentUserId) {
  const author = await db.asyncGet(
    'SELECT id, username, avatar_url FROM users WHERE id = ?', [post.user_id]
  );
  const { count: likeCount }    = await db.asyncGet('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [post.id]);
  const { count: commentCount } = await db.asyncGet('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [post.id]);
  const isLiked = !!(await db.asyncGet(
    'SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [post.id, currentUserId]
  ));
  return { ...post, author, like_count: likeCount, comment_count: commentCount, is_liked: isLiked };
}

// GET /api/posts/feed — home feed (own posts + followed users)
router.get('/feed', auth, async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const limit  = 20;
    const offset = (page - 1) * limit;

    const posts = await db.asyncAll(
      `SELECT * FROM posts
       WHERE user_id = ?
          OR user_id IN (SELECT followee_id FROM follows WHERE follower_id = ?)
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [req.userId, req.userId, limit, offset]
    );

    const enriched = await Promise.all(posts.map((p) => enrichPost(p, req.userId)));
    return res.json(enriched);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/explore — all posts
router.get('/explore', auth, async (req, res) => {
  try {
    const page   = parseInt(req.query.page) || 1;
    const limit  = 20;
    const offset = (page - 1) * limit;

    const posts = await db.asyncAll(
      'SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    const enriched = await Promise.all(posts.map((p) => enrichPost(p, req.userId)));
    return res.json(enriched);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts — create post
router.post(
  '/',
  auth,
  [
    body('content').trim().notEmpty().withMessage('Content required').isLength({ max: 500 }).withMessage('Max 500 chars'),
    body('image_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid image URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { content, image_url = '' } = req.body;
      const result = await db.asyncRun(
        'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
        [req.userId, content, image_url]
      );
      const post = await db.asyncGet('SELECT * FROM posts WHERE id = ?', [result.lastID]);
      return res.status(201).json(await enrichPost(post, req.userId));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/posts/:id — single post
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await db.asyncGet('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    return res.json(await enrichPost(post, req.userId));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/posts/:id — edit post (author only)
router.put(
  '/:id',
  auth,
  [body('content').trim().notEmpty().isLength({ max: 500 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const post = await db.asyncGet('SELECT * FROM posts WHERE id = ?', [req.params.id]);
      if (!post) return res.status(404).json({ error: 'Post not found' });
      if (post.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

      await db.asyncRun(
        'UPDATE posts SET content = ?, is_edited = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [req.body.content, post.id]
      );
      const updated = await db.asyncGet('SELECT * FROM posts WHERE id = ?', [post.id]);
      return res.json(await enrichPost(updated, req.userId));
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/posts/:id — delete post (author only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await db.asyncGet('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

    await db.asyncRun('DELETE FROM posts WHERE id = ?', [post.id]);
    return res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await db.asyncGet('SELECT id FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    try {
      await db.asyncRun('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [post.id, req.userId]);
    } catch (e) {
      return res.status(400).json({ error: 'Already liked' });
    }

    const { count: likeCount } = await db.asyncGet('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [post.id]);
    return res.status(201).json({ liked: true, like_count: likeCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/posts/:id/like
router.delete('/:id/like', auth, async (req, res) => {
  try {
    const post = await db.asyncGet('SELECT id FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    await db.asyncRun('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [post.id, req.userId]);

    const { count: likeCount } = await db.asyncGet('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [post.id]);
    return res.json({ liked: false, like_count: likeCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const post = await db.asyncGet('SELECT id FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comments = await db.asyncAll(
      `SELECT c.*, u.username, u.avatar_url
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`,
      [post.id]
    );
    return res.json(comments);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/posts/:id/comments
router.post(
  '/:id/comments',
  auth,
  [body('content').trim().notEmpty().isLength({ max: 300 }).withMessage('Comment max 300 chars')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const post = await db.asyncGet('SELECT id FROM posts WHERE id = ?', [req.params.id]);
      if (!post) return res.status(404).json({ error: 'Post not found' });

      const result = await db.asyncRun(
        'INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)',
        [post.id, req.userId, req.body.content]
      );

      const comment = await db.asyncGet(
        `SELECT c.*, u.username, u.avatar_url
         FROM comments c JOIN users u ON u.id = c.user_id
         WHERE c.id = ?`,
        [result.lastID]
      );
      return res.status(201).json(comment);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/posts/comments/:id — delete comment (comment author OR post author)
router.delete('/comments/:id', auth, async (req, res) => {
  try {
    const comment = await db.asyncGet('SELECT * FROM comments WHERE id = ?', [req.params.id]);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const post = await db.asyncGet('SELECT user_id FROM posts WHERE id = ?', [comment.post_id]);
    const canDelete = comment.user_id === req.userId || (post && post.user_id === req.userId);
    if (!canDelete) return res.status(403).json({ error: 'Forbidden' });

    await db.asyncRun('DELETE FROM comments WHERE id = ?', [comment.id]);
    return res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
