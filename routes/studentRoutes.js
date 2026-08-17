const express = require("express");
const multer = require("multer");

const router = express.Router();

const studentController =
    require("../controllers/studentController");

const authMiddleware =
    require("../middleware/authMiddleware");

const roleMiddleware =
    require("../middleware/roleMiddleware");


// ==========================================
// MULTER CONFIGURATION
// ==========================================
//
// Excel files are kept in memory.
// They are not permanently saved on server.
//

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
});


// ==========================================
// ADMIN + TEACHER
// ==========================================
//
// Both Admin and Teacher can:
//
// - Create students
// - Import Excel
// - View students
// - View individual student
// - Edit students
// - Delete students
//
// IMPORTANT:
//
// The controller still checks the teacher's
// assigned class.
//
// Therefore:
//
// Admin
//   -> can manage all students
//
// Teacher
//   -> can manage only students in
//      their assigned class
//
// ==========================================


// ==========================================
// CREATE STUDENT
// POST /api/students
// ==========================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    studentController.createStudent
);


// ==========================================
// BULK CREATE / UPDATE STUDENTS
// POST /api/students/bulk
//
// Content-Type:
// multipart/form-data
//
// Field:
// file
// ==========================================

router.post(
    "/bulk",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    upload.single("file"),
    studentController.bulkUploadStudents
);


// ==========================================
// GET ALL STUDENTS
// GET /api/students
// ==========================================
//
// Admin:
//   -> all students
//
// Teacher:
//   -> only students from assigned class
//

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    studentController.getAllStudents
);


// ==========================================
// GET STUDENT BY ID
// GET /api/students/:id
// ==========================================

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    studentController.getStudentById
);


// ==========================================
// UPDATE STUDENT
// PUT /api/students/:id
// ==========================================
//
// Admin:
//   -> can edit any student
//
// Teacher:
//   -> can edit only students from
//      assigned class
//

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    studentController.updateStudent
);


// ==========================================
// DELETE STUDENT
// DELETE /api/students/:id
// ==========================================
//
// Admin:
//   -> can delete any student
//
// Teacher:
//   -> can delete only students from
//      assigned class
//
// The controller performs the actual
// class-ownership security check.
//

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    studentController.deleteStudent
);


// ==========================================
// EXPORT
// ==========================================

module.exports = router;