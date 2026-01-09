const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // 6.1: Lesson Content
    lessons: [
        {
            title: String,
            contentUrl: String, // This will hold the Cloudinary link later
            contentType: { type: String, enum: ['video', 'pdf', 'link'] }
        }
    ],

    // 6.2: Quiz System
    quizzes: [
        {
            question: String,
            options: [String],
            correctAnswerIndex: Number 
        }
    ],
    // Add this inside the courseSchema
assignments: [
    {
        title: String,
        instructions: String,
        submissions: [
            {
                student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                fileUrl: String,
                grade: Number,
                status: { type: String, default: 'Pending' } // Pending, Graded
            }
        ]
    }
],
    
    studentsEnrolled: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);