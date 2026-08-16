const express = require("express");

const router = express.Router();

const teacherController = require("../controllers/teacherController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ==========================================
// ADMIN ONLY
// ==========================================

// Create Teacher
// POST /api/teachers
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    teacherController.createTeacher
);

// Get All Teachers
// GET /api/teachers
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    teacherController.getAllTeachers
);

// Get Teacher By ID
// GET /api/teachers/:id
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    teacherController.getTeacherById
);

// Update Teacher
// PUT /api/teachers/:id
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    teacherController.updateTeacher
);

// Delete Teacher
// DELETE /api/teachers/:id
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    teacherController.deleteTeacher
);

module.exports = router;