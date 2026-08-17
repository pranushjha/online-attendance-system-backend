const express = require("express");

const router = express.Router();

const classController = require("../controllers/classController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ==========================================
// ADMIN ONLY
// ==========================================

// Create Class
// POST /api/classes
router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    classController.createClass
);

// Get All Classes
// GET /api/classes
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    classController.getAllClasses
);

// ==========================================
// TEACHER
// ==========================================

// Get My Assigned Class
// GET /api/classes/my-class
router.get(
    "/my-class",
    authMiddleware,
    roleMiddleware("teacher"),
    classController.getMyClass
);

// ==========================================
// ADMIN ONLY
// ==========================================

// Get Class By ID
// GET /api/classes/:id
router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    classController.getClassById
);

// Update Class
// PUT /api/classes/:id
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    classController.updateClass
);

// Delete Class
// DELETE /api/classes/:id
router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    classController.deleteClass
);

module.exports = router;