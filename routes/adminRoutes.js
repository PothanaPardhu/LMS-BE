const express = require('express');
const router = express.Router();
const { 
    getAnalytics, 
    getAllUsers, 
    createCategory, 
    getCategories, 
    approveInstructor, 
    deleteCategory 
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Logged in users only
router.use(protect);

// Shared route: Instructors need this to list categories for new courses
router.get('/categories', getCategories); 

// Admin only routes
router.use(adminOnly);

router.get('/analytics', getAnalytics);
router.get('/users', getAllUsers);
router.post('/category', createCategory);
router.put('/approve-instructor', approveInstructor); // UI calls this to approve instructors
router.delete('/category/:id', deleteCategory);

module.exports = router;