require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');

const authRoutes      = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');

// ── Connect to MongoDB ─────────────────────────────────────
connectDB();

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082',
           'http://127.0.0.1:8080', 'http://127.0.0.1:8081', 'http://127.0.0.1:8082',
           'http://localhost:5500', 'null'],  // 'null' for file:// origin
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev) ───────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── Routes ─────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/complaints', complaintRoutes);

// ── Health check ───────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ success: true, message: 'DCMS API is running ✅', time: new Date().toISOString() })
);

// ── 404 handler ────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` })
);

// ── Global error handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error.'
  });
});

// ── Start server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 DCMS Server running on http://localhost:${PORT}`);
  console.log(`📋 API docs: http://localhost:${PORT}/api/health\n`);
});
