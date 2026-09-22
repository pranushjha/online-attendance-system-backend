const express = require("express");

const {
    createAdmin,
    createTeacher,
    adminLogin,
    teacherLogin,
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();


// ==========================================
// PUBLIC ROUTES
// ==========================================

// Admin Login
router.post("/admin/login", adminLogin);

// Teacher Login
router.post("/teacher/login", teacherLogin);


// ==========================================
// ADMIN ONLY ROUTES
// ==========================================

// Create Admin
router.post(
    "/admin/create",
    authMiddleware,
    roleMiddleware("admin"),
    createAdmin
);

// Create Teacher
router.post(
    "/teacher/create",
    authMiddleware,
    roleMiddleware("admin"),
    createTeacher
);


// ==========================================
// LOGGED-IN USER
// ==========================================

// Get current user
router.get(
    "/me",
    authMiddleware,
    (req, res) => {
        res.status(200).json({
            success: true,
            user: req.user,
        });
    }
);


// Logout
router.post(
    "/logout",
    authMiddleware,
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Logout successful",
        });
    }
);


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;