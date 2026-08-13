const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// ==========================================
// ADMIN ONLY
// ==========================================

// Get all classes
router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    (req, res) => {
        res.status(200).json({
            success: true,
            message: "Classes route accessed successfully",
        });
    }
);

module.exports = router;