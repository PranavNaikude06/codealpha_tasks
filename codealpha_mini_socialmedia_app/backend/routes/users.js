const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:username — get profile
router.get('/:username', auth, async (req, res) => {
  try {
    const user = await db.asyncGet(
      'SELECT id, username, bio, avatar_url, created_at FROM users WHERE username = ?',
      [req.params.username]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { count: postCount }     = await db.asyncGet('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [user.id]);
    const { count: followerCount } = await db.asyncGet('SELECT COUNT(*) as count FROM follows WHERE followee_id = ?', [user.id]);
    const { count: followingCount }= await db.asyncGet('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [user.id]);
    const isFollowing = !!(await db.asyncGet(
      'SELECT id FROM follows WHERE follower_id = ? AND followee_id = ?',
      [req.userId, user.id]
    ));

    return res.json({
      ...user,
      post_count: postCount,
      follower_count: followerCount,
      following_count: followingCount,
      is_following: isFollowing,
      is_own: req.userId === user.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/users/:username — edit own profile
router.put(
  '/:username',
  auth,
  [
    body('bio').optional().isLength({ max: 300 }).withMessage('Bio max 300 chars'),
    body('avatar_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const user = await db.asyncGet('SELECT id FROM users WHERE username = ?', [req.params.username]);
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.id !== req.userId) return res.status(403).json({ error: 'Forbidden' });

      const { bio = '', avatar_url = '' } = req.body;
      await db.asyncRun('UPDATE users SET bio = ?, avatar_url = ? WHERE id = ?', [bio, avatar_url, user.id]);

      const updated = await db.asyncGet(
        'SELECT id, username, bio, avatar_url, created_at FROM users WHERE id = ?',
        [user.id]
      );
      return res.json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/users/:username/posts — get posts by specific user
router.get('/:username/posts', auth, async (req, res) => {
  try {
    const user = await db.asyncGet('SELECT id, username, avatar_url FROM users WHERE username = ?', [req.params.username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const posts = await db.asyncAll(
      'SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );

    const enriched = await Promise.all(posts.map(async (p) => {
      const { count: likeCount }    = await db.asyncGet('SELECT COUNT(*) as count FROM likes WHERE post_id = ?', [p.id]);
      const { count: commentCount } = await db.asyncGet('SELECT COUNT(*) as count FROM comments WHERE post_id = ?', [p.id]);
      const isLiked = !!(await db.asyncGet(
        'SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [p.id, req.userId]
      ));
      return { ...p, author: user, like_count: likeCount, comment_count: commentCount, is_liked: isLiked };
    }));

    return res.json(enriched);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:username/followers
router.get('/:username/followers', auth, async (req, res) => {
  try {
    const user = await db.asyncGet('SELECT id FROM users WHERE username = ?', [req.params.username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const followers = await db.asyncAll(
      `SELECT u.id, u.username, u.bio, u.avatar_url
       FROM follows f JOIN users u ON u.id = f.follower_id
       WHERE f.followee_id = ? ORDER BY f.created_at DESC`,
      [user.id]
    );
    return res.json(followers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/users/:username/following
router.get('/:username/following', auth, async (req, res) => {
  try {
    const user = await db.asyncGet('SELECT id FROM users WHERE username = ?', [req.params.username]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const following = await db.asyncAll(
      `SELECT u.id, u.username, u.bio, u.avatar_url
       FROM follows f JOIN users u ON u.id = f.followee_id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC`,
      [user.id]
    );
    return res.json(following);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:username/follow
router.post('/:username/follow', auth, async (req, res) => {
  try {
    const target = await db.asyncGet('SELECT id FROM users WHERE username = ?', [req.params.username]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.userId) return res.status(400).json({ error: 'Cannot follow yourself' });

    await db.asyncRun(
      'INSERT IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)',
      [req.userId, target.id]
    );

    const { count: followerCount } = await db.asyncGet(
      'SELECT COUNT(*) as count FROM follows WHERE followee_id = ?', [target.id]
    );
    return res.json({ following: true, follower_count: followerCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/users/:username/follow
router.delete('/:username/follow', auth, async (req, res) => {
  try {
    const target = await db.asyncGet('SELECT id FROM users WHERE username = ?', [req.params.username]);
    if (!target) return res.status(404).json({ error: 'User not found' });

    await db.asyncRun('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [req.userId, target.id]);

    const { count: followerCount } = await db.asyncGet(
      'SELECT COUNT(*) as count FROM follows WHERE followee_id = ?', [target.id]
    );
    return res.json({ following: false, follower_count: followerCount });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
