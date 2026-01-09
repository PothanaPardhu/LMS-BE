const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const adminRoutes = require('./routes/adminRoutes');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 1. Serve static files from the React dist folder
// This handles your CSS, JS, and Images
app.use(express.static(path.join(__dirname, 'dist')));

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.log("Database Connection Error: ", err));

// 2. The "Crash-Proof" Catch-All Route
// By NOT using a string like '*', we avoid the PathError in Node v23.
app.use((req, res, next) => {
    // If the request is for an API but no route matched, send a 404
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ message: "API route not found" });
    }
    // For everything else, send the React index.html
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Port Configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});