const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// ==========================================
// TEACHER ONLY
// ==========================================

// Get attendance
router.get(
    "/",
    authMiddleware,
    roleMiddleware("teacher"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Attendance route accessed successfully",
        });
    }
);

// Create attendance
router.post(
    "/",
    authMiddleware,
    roleMiddleware("teacher"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Create attendance route accessed successfully",
        });
    }
);

// Update attendance
router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("teacher"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Update attendance route accessed successfully",
        });
    }
);

module.exports = router;