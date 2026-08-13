const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// ==========================================
// ADMIN + TEACHER
// ==========================================

// Get attendance reports
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Reports route accessed successfully",
        });
    }
);

module.exports = router;