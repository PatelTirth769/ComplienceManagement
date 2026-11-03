const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS Configuration (supports '*' or comma-separated origins from CORS_ORIGIN in .env)
const corsOrigin = config.corsOrigin === '*'
  ? '*'
  : config.corsOrigin.split(',').map(s => s.trim());

app.use(cors({
  origin: corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON Payloads with auto-recovery for unescaped backslashes (e.g. Windows paths, passwords, manual curl/postman payloads)
app.use(express.text({ type: ['application/json', 'text/json'], limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  if (typeof req.body === 'string') {
    if (!req.body.trim()) {
      req.body = {};
      return next();
    }
    try {
      req.body = JSON.parse(req.body);
    } catch (err) {
      try {
        // Attempt recovery from unescaped backslashes (common in Windows paths, passwords, or manual inputs)
        const repaired = req.body.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
        req.body = JSON.parse(repaired);
      } catch (repairErr) {
        const syntaxErr = new SyntaxError(err.message);
        syntaxErr.status = 400;
        syntaxErr.body = req.body;
        return next(syntaxErr);
      }
    }
  } else if (!req.body) {
    req.body = {};
  }
  next();
});
app.use(express.urlencoded({ extended: true }));

// Register API Routes
app.use('/api', routes);

// Serve Frontend dist static files in production if dist folder exists
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  // SPA Catch-all: For any GET route that is NOT an /api route, serve index.html for client-side routing
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// 404 Route Handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
