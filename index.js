const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const adminRoutes = require('./routes/adminRoutes');
require('dotenv').config();

const app = express();

// 1. MIDDLEWARE & STATIC FILES
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from React (Fixes MIME type errors)
app.use(express.static(path.join(__dirname, 'dist')));
// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://lms-be1.onrender.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 2. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);

// 3. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.log("Database Connection Error: ", err));

// 4. THE CRASH-PROOF CATCH-ALL
// We use app.use() without a path string to avoid the Node v23 PathError.
app.use((req, res, next) => {
    // If it's an API request that wasn't caught above, return a 404
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ message: "API route not found" });
    }
    // For everything else (React Router paths), serve index.html
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Port Configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});