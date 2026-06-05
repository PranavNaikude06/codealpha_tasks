require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes  = require('./routes/auth');
const userRoutes  = require('./routes/users');
const postRoutes  = require('./routes/posts');

const app = express();

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Standalone comment delete route (from posts router)
// Already handled inside posts router as DELETE /api/posts/comments/:id

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', app: 'Nexus API' }));

// ── 404 handler ───────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong' });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Nexus API running at http://127.0.0.1:${PORT}/api`);
});
