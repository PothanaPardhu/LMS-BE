const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF or Word documents are allowed'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'FILE_TOO_LARGE') {
            return res.status(400).json({ message: 'File is too large. Maximum size is 10MB.' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ message: 'Only one file can be uploaded at a time.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
        return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
};

const { 
    createCourse, 
    getAllCourses, 
    enrollInCourse, 
    submitQuiz, 
    addLesson ,
    addQuiz ,
    addAssignment,
    getEnrolledStudents,
    getCourseSubmissions, 
    submitAssignment,
    getCourseById,
    gradeAssignment,
    unenrollFromCourse,
    deleteCourse
} = require('../controllers/courseController');
const { protect } = require('../middleware/authMiddleware');


// Public route: Anyone can see courses
router.get('/', getAllCourses);

// Protected route: Only logged-in instructors can create
router.post('/create', protect, createCourse);

// Instructor grades student assignment (must be before /:id routes)
router.put('/grade-assignment', protect, gradeAssignment);

router.post('/enroll/:id', protect, enrollInCourse);

router.post('/unenroll/:id', protect, unenrollFromCourse);

router.post('/:id/submit-quiz', protect, submitQuiz);

router.post('/:id/add-lesson', protect, addLesson);

router.post('/:id/add-quiz', protect, addQuiz);

router.post('/:id/add-assignment', protect, addAssignment);

// Student submits an assignment with a file upload
router.post('/:id/submit-assignment', protect, upload.single('file'), handleMulterError, submitAssignment);

router.get('/:id/students', protect, getEnrolledStudents);

router.get('/:id/submissions', protect, getCourseSubmissions);

// Add this if missing
router.get('/:id', protect, getCourseById);

router.delete('/:id', protect, deleteCourse);

module.exports = router;