const Teacher = require("../models/teacher");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");

// ==========================================
// GET ADMIN DASHBOARD
// GET /api/dashboard
// ADMIN ONLY
// ==========================================

const getDashboard = async (req, res) => {
    try {

        // ==========================================
        // AUTHENTICATION
        // ==========================================

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        // ==========================================
        // ADMIN ONLY
        // ==========================================

        if (req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can view the dashboard",
            });
        }

        // ==========================================
        // GET COUNTS
        // ==========================================

        const totalTeachers = await Teacher.countDocuments();

        const totalClasses = await Class.countDocuments();

        const totalStudents = await Student.countDocuments({
            active: true,
        });

        const totalAttendanceRecords =
            await Attendance.countDocuments();

        // ==========================================
        // CALCULATE OVERALL ATTENDANCE
        // ==========================================

        const attendanceRecords = await Attendance.find({})
            .select("students");

        let totalPresent = 0;
        let totalAbsent = 0;

        attendanceRecords.forEach((attendance) => {

            attendance.students.forEach((student) => {

                if (student.status === "Present") {
                    totalPresent++;
                }

                else if (student.status === "Absent") {
                    totalAbsent++;
                }

            });

        });

        const totalAttendance =
            totalPresent + totalAbsent;

        const overallAttendance =
            totalAttendance > 0
                ? Number(
                    (
                        (totalPresent / totalAttendance) *
                        100
                    ).toFixed(2)
                )
                : 0;

        // ==========================================
        // RECENT ATTENDANCE
        // ==========================================

        const recentAttendance = await Attendance.find({})
            .populate("classId", "className")
            .populate("markedBy", "name email")
            .select(
                "classId date markedBy students createdAt"
            )
            .sort({
                date: -1,
            })
            .limit(5);

        // ==========================================
        // FORMAT RECENT ATTENDANCE
        // ==========================================

        const recentAttendanceFormatted =
            recentAttendance.map((attendance) => {

                let present = 0;
                let absent = 0;

                attendance.students.forEach((student) => {

                    if (student.status === "Present") {
                        present++;
                    }

                    else if (student.status === "Absent") {
                        absent++;
                    }

                });

                const totalStudents =
                    attendance.students.length;

                const percentage =
                    totalStudents > 0
                        ? Number(
                            (
                                (present / totalStudents) *
                                100
                            ).toFixed(2)
                        )
                        : 0;

                return {
                    attendanceId: attendance._id,

                    classId:
                        attendance.classId?._id || null,

                    className:
                        attendance.classId?.className ||
                        "Unknown",

                    date: attendance.date,

                    markedBy:
                        attendance.markedBy || null,

                    totalStudents,

                    present,

                    absent,

                    percentage,
                };

            });

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({

            success: true,

            statistics: {
                totalTeachers,
                totalClasses,
                totalStudents,
                totalAttendanceRecords,
                overallAttendance,
            },

            recentAttendance:
                recentAttendanceFormatted,
        });

    } catch (error) {

        console.error(
            "Get Dashboard Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });

    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    getDashboard,
};