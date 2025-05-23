const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const helmet = require('helmet');


// Initialize Express app
const app = express();

// Connect to Database
connectDB();

// CORS Configuration - Make sure this comes BEFORE route definitions
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5000', 'http://127.0.0.1:5000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
}));

const routes = require('./routes');
// Initialize Middleware
app.use(express.json({ extended: false }));


// Use helmet with custom CSP
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            fontSrc: ["'self'", "data:", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            connectSrc: ["'self'", "http://localhost:5000", "http://127.0.0.1:5000"]
        }
    })
);

// Define Routes
app.use(routes);

// Error Handler (should be last piece of middleware)
app.use(errorHandler);

module.exports = app;

