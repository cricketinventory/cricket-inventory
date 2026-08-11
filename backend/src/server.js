require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { ensureSchema } = require('./db/schema');
const { ensureAdmin } = require('./db/ensure-admin');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const itemRoutes = require('./routes/items');

// Refuse to start with a missing or obviously weak JWT secret — a weak secret
// lets anyone forge login tokens for any account, including admin.
const WEAK_SECRETS = ['change-this-to-a-long-random-string', 'secret', 'test-secret-key-12345', ''];
if (!process.env.JWT_SECRET || WEAK_SECRETS.includes(process.env.JWT_SECRET) || process.env.JWT_SECRET.length < 20) {
  console.error(
    '[startup] JWT_SECRET is missing, default, or too short (needs 20+ random characters). ' +
    'Set a strong, unique JWT_SECRET in your .env / hosting environment variables before starting.'
  );
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Slow down brute-force login attempts: 10 tries per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in a few minutes.' },
});
app.use('/api/auth/login', loginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);

// Generic error handler (must be defined after routes)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 4000;

async function start() {
  await ensureSchema();
  await ensureAdmin();
  app.listen(PORT, () => {
    console.log(`Cricket Inventory API running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[startup] Failed to start server:', err);
  process.exit(1);
});
