const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController'); // Add login here

// Route: POST /api/auth/register
router.post('/register', register);
router.post('/login', login); // Add this line

module.exports = router;