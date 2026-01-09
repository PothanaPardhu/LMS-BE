const Course = require('../models/Course');
const User = require('../models/User');

exports.createCourse = async (req, res) => {
    try {
        // Check if the user is actually an instructor
        if (req.user.role !== 'instructor') {
            return res.status(403).json({ message: "Access denied. Only instructors can create courses." });
        }

        const { title, description, category } = req.body;

        const newCourse = new Course({
            title,
            description,
            category,
            instructor: req.user.id // Taken from the JWT token
        });

        await newCourse.save();
        res.status(201).json({ message: "Course created successfully", course: newCourse });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

exports.getAllCourses = async (req, res) => {
    try {
        const courses = await Course.find().populate('instructor', 'name');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.enrollInCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        const userId = req.user.id; // From JWT

        // Validate courseId format
        if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid course ID format" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        // Check if already enrolled
        if (course.studentsEnrolled.includes(userId)) {
            return res.status(400).json({ message: "Already enrolled in this course" });
        }

        // Add student to course
        course.studentsEnrolled.push(userId);
        await course.save();

        // Add course to student's profile
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Initialize enrolledCourses if it doesn't exist
        if (!user.enrolledCourses) {
            user.enrolledCourses = [];
        }

        user.enrolledCourses.push(courseId);
        await user.save();

        res.status(200).json({ 
            message: "Enrolled successfully",
            course: course.title,
            enrolledCoursesCount: user.enrolledCourses.length
        });
    } catch (err) {
        console.error('Enrollment error:', err);
        res.status(500).json({ message: "Server error during enrollment", error: err.message });
    }
};

exports.submitQuiz = async (req, res) => {
    try {
        const { answers } = req.body; // e.g. [0, 2, 1] (indices of chosen answers)
        const course = await Course.findById(req.params.id);
        
        if (!course) return res.status(404).json({ message: "Course not found" });

        let score = 0;
        course.quizzes.forEach((quiz, index) => {
            if (quiz.correctAnswerIndex === answers[index]) {
                score++;
            }
        });

        res.json({ 
            message: "Quiz evaluated", 
            score, 
            total: course.quizzes.length,
            percentage: (score / course.quizzes.length) * 100 
        });
    } catch (err) {
        res.status(500).json({ message: "Error submitting quiz" });
    }
};

exports.addLesson = async (req, res) => {
    try {
        const { title, contentUrl, contentType } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: "Course not found" });
        }

        // Add a console.log here to help us debug in the terminal
        console.log("Instructor ID from DB:", course.instructor.toString());
        console.log("User ID from Token:", req.user.id);

        if (course.instructor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied: Not your course" });
        }

        course.lessons.push({ title, contentUrl, contentType });
        await course.save();

        res.json({ message: "Lesson added successfully", course });
    } catch (err) {
        console.error(err); // This will show the real error in your VS Code terminal
        res.status(500).json({ message: "Error adding lesson", error: err.message });
    }
};

exports.addQuiz = async (req, res) => {
    try {
        const { question, options, correctAnswerIndex } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ message: "Course not found" });

        // Security check
        if (course.instructor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        course.quizzes.push({ question, options, correctAnswerIndex });
        await course.save();

        res.json({ message: "Quiz question added successfully", course });
    } catch (err) {
        res.status(500).json({ message: "Error adding quiz" });
    }
};

// Student submits assignment (handles multipart file upload)
exports.submitAssignment = async (req, res) => {
    try {
        const courseId = req.params.id;
        const { assignmentId } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "No file was uploaded" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        const assignment = course.assignments.id(assignmentId);
        if (!assignment) return res.status(404).json({ message: "Assignment not found" });

        // Construct file URL
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

        assignment.submissions.push({ 
            student: req.user.id, 
            fileUrl, 
            status: 'Submitted',
            submittedAt: new Date()
        });
        
        await course.save();
        res.status(200).json({ 
            message: "Assignment submitted successfully!", 
            fileUrl: fileUrl 
        });
    } catch (err) {
        console.error('Error in submitAssignment:', err);
        res.status(500).json({ message: "Error submitting assignment", error: err.message });
    }
};

// Instructor grades assignment
exports.gradeAssignment = async (req, res) => {
    try {
        const { courseId, assignmentId, submissionId, grade } = req.body;
        
        console.log('Grading assignment with:', { courseId, assignmentId, submissionId, grade, userId: req.user?.id });

        // Validation
        if (!courseId || !assignmentId || !submissionId) {
            console.log('Missing required fields');
            return res.status(400).json({ message: "Missing required fields: courseId, assignmentId, submissionId" });
        }

        if (grade === undefined || grade === null || grade === '') {
            console.log('Missing grade');
            return res.status(400).json({ message: "Grade is required and must be a valid number" });
        }

        const gradeNum = parseFloat(grade);
        if (isNaN(gradeNum) || gradeNum < 0) {
            console.log('Invalid grade value:', grade);
            return res.status(400).json({ message: "Grade must be a valid positive number" });
        }

        const course = await Course.findById(courseId);
        if (!course) {
            console.log('Course not found:', courseId);
            return res.status(404).json({ message: "Course not found" });
        }

        // Verify instructor ownership
        if (course.instructor.toString() !== req.user.id) {
            console.log('Access denied:', { instructorId: course.instructor.toString(), userId: req.user.id });
            return res.status(403).json({ message: "Access denied: You are not the instructor of this course" });
        }

        const assignment = course.assignments.id(assignmentId);
        if (!assignment) {
            console.log('Assignment not found:', assignmentId);
            return res.status(404).json({ message: "Assignment not found" });
        }

        const submission = assignment.submissions.id(submissionId);
        if (!submission) {
            console.log('Submission not found:', submissionId);
            console.log('Available submissions:', assignment.submissions.map(s => s._id));
            return res.status(404).json({ message: "Submission not found" });
        }

        submission.grade = gradeNum;
        submission.status = 'Graded';
        submission.gradedAt = new Date();

        await course.save();
        
        console.log('Grade saved successfully:', { submissionId, grade: gradeNum });
        
        res.status(200).json({ 
            message: "Grade updated successfully!",
            grade: gradeNum,
            submissionId: submissionId
        });
    } catch (err) {
        console.error('Grading error:', err);
        res.status(500).json({ message: "Error updating grade", error: err.message });
    }
};

exports.completeLesson = async (req, res) => {
    try {
        const { courseId, lessonId } = req.body;
        const user = await User.findById(req.user.id);

        // Add lessonId to a 'completedLessons' array (we should add this to User model)
        if (!user.completedLessons) user.completedLessons = [];
        
        if (!user.completedLessons.includes(lessonId)) {
            user.completedLessons.push(lessonId);
            await user.save();
        }

        res.json({ message: "Lesson marked as completed", completedLessons: user.completedLessons });
    } catch (err) {
        res.status(500).json({ message: "Error updating progress" });
    }
};
// Add this to your courseController.js
exports.addAssignment = async (req, res) => {
    try {
        const { title, instructions } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ message: "Course not found" });

        // Security check: Only the owner can add assignments
        if (course.instructor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        course.assignments.push({ title, instructions });
        await course.save();

        res.json({ message: "Assignment added successfully", course });
    } catch (err) {
        res.status(500).json({ message: "Error adding assignment", error: err.message });
    }
};

// Add this to your courseController.js
exports.getEnrolledStudents = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('studentsEnrolled', 'name email');
        
        if (!course) return res.status(404).json({ message: "Course not found" });

        // Security check
        if (course.instructor.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied" });
        }

        res.json(course.studentsEnrolled);
    } catch (err) {
        res.status(500).json({ message: "Error fetching students" });
    }
};

// Add to courseController.js
exports.getCourseSubmissions = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('assignments.submissions.student', 'name email');
        
        if (!course) return res.status(404).json({ message: "Course not found" });
        if (course.instructor.toString() !== req.user.id) return res.status(403).json({ message: "Access denied" });

        // Flatten assignments to just show submissions for the UI
        const allSubmissions = course.assignments.map(assign => ({
            assignmentTitle: assign.title,
            assignmentId: assign._id,
            submissions: assign.submissions
        }));

        res.json(allSubmissions);
    } catch (err) {
        res.status(500).json({ message: "Error fetching submissions" });
    }
};
exports.getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('instructor', 'name');
        if (!course) return res.status(404).json({ message: "Course not found" });
        res.json(course);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};

exports.unenrollFromCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        const userId = req.user.id; // From JWT

        // Validate courseId format
        if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid course ID format" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        // Check if user is enrolled
        if (!course.studentsEnrolled.includes(userId)) {
            return res.status(400).json({ message: "You are not enrolled in this course" });
        }

        // Remove student from course
        course.studentsEnrolled = course.studentsEnrolled.filter(id => id.toString() !== userId);
        await course.save();

        // Remove course from student's profile
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.enrolledCourses) {
            user.enrolledCourses = user.enrolledCourses.filter(id => id.toString() !== courseId);
        }
        await user.save();

        res.status(200).json({ 
            message: "Unenrolled successfully",
            course: course.title,
            enrolledCoursesCount: user.enrolledCourses ? user.enrolledCourses.length : 0
        });
    } catch (err) {
        console.error('Unenrollment error:', err);
        res.status(500).json({ message: "Server error during unenrollment", error: err.message });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const courseId = req.params.id;
        const userId = req.user.id; // From JWT

        // Validate courseId format
        if (!courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid course ID format" });
        }

        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: "Course not found" });

        // Check if user is the instructor of this course
        if (course.instructor.toString() !== userId) {
            return res.status(403).json({ message: "Only the course instructor can delete this course" });
        }

        // Remove course from all enrolled students' profiles
        if (course.studentsEnrolled && course.studentsEnrolled.length > 0) {
            await User.updateMany(
                { _id: { $in: course.studentsEnrolled } },
                { $pull: { enrolledCourses: courseId } }
            );
        }

        // Delete the course
        await Course.findByIdAndDelete(courseId);

        res.status(200).json({ 
            message: "Course deleted successfully",
            courseId: courseId
        });
    } catch (err) {
        console.error('Delete course error:', err);
        res.status(500).json({ message: "Server error during course deletion", error: err.message });
    }
};