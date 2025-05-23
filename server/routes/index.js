const express = require('express');
const router = express.Router();
const path = require('path');

// API Routes
router.use('/api/auth', require('./api/auth'));
router.use('/api/users', require('./api/users'));
router.use('/api/debates', require('./api/debates'));
router.use('/api/judges', require('./api/judges'));

// Serve static assets in development and production
router.use(express.static(path.join(__dirname, '../../frontend')));

// For any route not handled by API or static files, serve the index.html
router.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/pages/index.html'));
});

module.exports = router;