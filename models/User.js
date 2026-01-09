const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['student', 'instructor', 'admin'], 
        default: 'student' 
    },
    
    enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    isApproved: { 
        type: Boolean, 
        default: function() {
            return this.role !== 'instructor'; 
            // This logic means Students and Admins are approved by default, 
            // but Instructors must wait for approval.
        }
    },
    // Add this inside the userSchema
completedLessons: [{ type: mongoose.Schema.Types.ObjectId }],
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);