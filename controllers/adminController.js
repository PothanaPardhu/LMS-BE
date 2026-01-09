const User = require('../models/User');
const Course = require('../models/Course');
const Category = require('../models/Category');

// 1. Get Platform Analytics
exports.getAnalytics = async (req, res) => {
    try {
        const userCount = await User.countDocuments();
        const courseCount = await Course.countDocuments();
        const instructorCount = await User.countDocuments({ role: 'instructor' });
        
        res.json({
            totalUsers: userCount,
            totalCourses: courseCount,
            totalInstructors: instructorCount
        });
    } catch (err) {
        res.status(500).json({ message: "Analytics error" });
    }
};

// 2. Manage Users (Get all)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: "Error fetching users" });
    }
};

// 3. Category Management
exports.createCategory = async (req, res) => {
    try {
        const { name } = req.body;
        const existing = await Category.findOne({ name });
        if (existing) return res.status(400).json({ message: "Category already exists" });

        const newCategory = new Category({ name });
        await newCategory.save();
        res.status(201).json({ message: "Category created successfully", newCategory });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

// 4. Instructor Approval
exports.approveInstructor = async (req, res) => {
    try {
        const { instructorId } = req.body;
        const user = await User.findById(instructorId);

        if (!user || user.role !== 'instructor') {
            return res.status(404).json({ message: "Instructor not found" });
        }

        user.isApproved = true;
        await user.save();
        res.json({ message: "Instructor approved successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);
        res.json({ message: "Category deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error deleting category" });
    }
};