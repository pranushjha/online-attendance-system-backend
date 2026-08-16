const express = require("express");

const router = express.Router();

const studentController = require("../controllers/studentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ==========================================
// ADMIN ONLY
// ==========================================

// Create Student
// POST /api/students
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    studentController.createStudent
);

// Get All Students
// GET /api/students
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    studentController.getAllStudents
);

// Get Student By ID
// GET /api/students/:id
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    studentController.getStudentById
);

// Update Student
// PUT /api/students/:id
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    studentController.updateStudent
);

// Delete Student
// DELETE /api/students/:id
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    studentController.deleteStudent
);

module.exports = router;