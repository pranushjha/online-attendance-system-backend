const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// ==========================================
// ADMIN ONLY
// ==========================================

// Get all teachers
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Teachers route accessed successfully",
        });
    }
);

module.exports = router;