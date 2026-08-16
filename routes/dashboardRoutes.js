const express = require("express");

const router = express.Router();

const dashboardController = require("../controllers/dashboardController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


// ==========================================
// ADMIN DASHBOARD
// GET /api/dashboard
// ADMIN ONLY
// ==========================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin"),
    dashboardController.getDashboard
);


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;
