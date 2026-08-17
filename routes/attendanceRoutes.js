const express = require("express");

const router = express.Router();

const attendanceController = require("../controllers/attendanceController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ==========================================
// ATTENDANCE ROUTES
// ==========================================


// ==========================================
// GET ALL ATTENDANCE
// GET /api/attendance
// ADMIN + TEACHER
// ==========================================

router.get(
    "/",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    attendanceController.getAttendance
);


// ==========================================
// GET CLASS ATTENDANCE REPORT
// GET /api/attendance/report/class/:classId
// ADMIN + TEACHER
// ==========================================

router.get(
    "/report/class/:classId",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    attendanceController.getClassAttendanceReport
);


// ==========================================
// GET STUDENT ATTENDANCE REPORT
// GET /api/attendance/report/student/:studentId
// ADMIN + TEACHER
// ==========================================

router.get(
    "/report/student/:studentId",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    attendanceController.getStudentAttendanceReport
);


// ==========================================
// GET DATE ATTENDANCE REPORT
// GET /api/attendance/report/date/:date
// ADMIN + TEACHER
// ==========================================

router.get(
    "/report/date/:date",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    attendanceController.getDateAttendanceReport
);


// ==========================================
// GET ATTENDANCE BY ID
// GET /api/attendance/:id
// ADMIN + TEACHER
// ==========================================

router.get(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    attendanceController.getAttendanceById
);


// ==========================================
// CREATE ATTENDANCE
// POST /api/attendance
// ADMIN + TEACHER
// ==========================================

router.post(
    "/",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    attendanceController.markAttendance
);


// ==========================================
// UPDATE ATTENDANCE
// PUT /api/attendance/:id
// ADMIN + TEACHER
// ==========================================

router.put(
    "/:id",
    authMiddleware,
    roleMiddleware("admin", "teacher"),
    attendanceController.updateAttendance
);


// ==========================================
// DELETE ATTENDANCE
// DELETE /api/attendance/:id
// ADMIN ONLY
// ==========================================

router.delete(
    "/:id",
    authMiddleware,
    roleMiddleware("admin"),
    attendanceController.deleteAttendance
);


// ==========================================
// EXPORT ROUTER
// ==========================================

module.exports = router;