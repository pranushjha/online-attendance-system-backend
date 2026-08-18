const Teacher = require("../models/teacher");
const Class = require("../models/Class");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");

// ==========================================
// HELPER
// NORMALIZE ATTENDANCE STATUS
// ==========================================

const normalizeStatus = (status) => {
    return String(status || "")
        .trim()
        .toLowerCase();
};

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
        // GET BASIC COUNTS
        // ==========================================

        const totalTeachers =
            await Teacher.countDocuments();

        const totalClasses =
            await Class.countDocuments();

        const totalStudents =
            await Student.countDocuments({
                active: true,
            });

        const totalAttendanceRecords =
            await Attendance.countDocuments();

        // ==========================================
        // GET ALL ATTENDANCE RECORDS
        //
        // We use ALL attendance records here because
        // class performance must be calculated from
        // the complete attendance history.
        // ==========================================

        const allAttendance =
            await Attendance.find({})
                .populate(
                    "classId",
                    "className"
                )
                .populate(
                    "markedBy",
                    "name email"
                )
                .select(
                    "classId date markedBy students createdAt"
                )
                .sort({
                    date: -1,
                    createdAt: -1,
                });

        // ==========================================
        // CALCULATE OVERALL ATTENDANCE
        // ==========================================

        let totalPresent = 0;
        let totalAbsent = 0;

        allAttendance.forEach(
            (attendance) => {
                if (
                    !Array.isArray(
                        attendance.students
                    )
                ) {
                    return;
                }

                attendance.students.forEach(
                    (student) => {
                        const status =
                            normalizeStatus(
                                student.status
                            );

                        if (
                            status ===
                            "present"
                        ) {
                            totalPresent++;
                        } else if (
                            status ===
                            "absent"
                        ) {
                            totalAbsent++;
                        }
                    }
                );
            }
        );

        const totalAttendance =
            totalPresent +
            totalAbsent;

        const overallAttendance =
            totalAttendance > 0
                ? Number(
                      (
                          (totalPresent /
                              totalAttendance) *
                          100
                      ).toFixed(2)
                  )
                : 0;

        // ==========================================
        // CLASS PERFORMANCE
        //
        // IMPORTANT:
        // Calculate attendance using ALL records
        // for each class.
        //
        // Example:
        //
        // Standard-2A:
        // Day 1 -> 0 Present / 5 Absent
        // Day 2 -> 0 Present / 3 Absent
        // Day 3 -> 2 Present / 7 Absent
        //
        // Overall:
        // Present = 2
        // Absent = 15
        // Attendance = 11.76%
        //
        // Therefore, one 100% attendance day will
        // NOT incorrectly make the class 100%.
        // ==========================================

        const classPerformanceMap =
            new Map();

        allAttendance.forEach(
            (attendance) => {
                // ----------------------------------
                // GET CLASS ID
                // ----------------------------------

                const classId =
                    attendance.classId?._id
                        ?.toString();

                // If class no longer exists,
                // ignore this attendance record.
                if (!classId) {
                    return;
                }

                const className =
                    attendance
                        .classId
                        ?.className ||
                    "Unknown Class";

                // ----------------------------------
                // CREATE CLASS ENTRY
                // ----------------------------------

                if (
                    !classPerformanceMap.has(
                        classId
                    )
                ) {
                    classPerformanceMap.set(
                        classId,
                        {
                            classId,
                            className,
                            attendanceDays: 0,
                            present: 0,
                            absent: 0,
                        }
                    );
                }

                const classData =
                    classPerformanceMap.get(
                        classId
                    );

                // ----------------------------------
                // COUNT ATTENDANCE DAY
                // ----------------------------------

                classData.attendanceDays++;

                // ----------------------------------
                // COUNT PRESENT / ABSENT
                // ----------------------------------

                if (
                    !Array.isArray(
                        attendance.students
                    )
                ) {
                    return;
                }

                attendance.students.forEach(
                    (student) => {
                        const status =
                            normalizeStatus(
                                student.status
                            );

                        if (
                            status ===
                            "present"
                        ) {
                            classData.present++;
                        } else if (
                            status ===
                            "absent"
                        ) {
                            classData.absent++;
                        }
                    }
                );
            }
        );

        // ==========================================
        // FORMAT CLASS PERFORMANCE
        // ==========================================

        const classPerformance =
            Array.from(
                classPerformanceMap.values()
            ).map(
                (classData) => {
                    const total =
                        classData.present +
                        classData.absent;

                    const percentage =
                        total > 0
                            ? Number(
                                  (
                                      (classData.present /
                                          total) *
                                      100
                                  ).toFixed(2)
                              )
                            : 0;

                    return {
                        classId:
                            classData.classId,

                        className:
                            classData.className,

                        attendanceDays:
                            classData.attendanceDays,

                        present:
                            classData.present,

                        absent:
                            classData.absent,

                        percentage,
                    };
                }
            );

        // ==========================================
        // SORT CLASS PERFORMANCE
        // HIGHEST ATTENDANCE FIRST
        // ==========================================

        classPerformance.sort(
            (a, b) =>
                b.percentage -
                a.percentage
        );

        // ==========================================
        // GET RECENT ATTENDANCE
        //
        // Only the latest 5 records are displayed
        // in the dashboard table.
        // ==========================================

        const recentAttendance =
            allAttendance.slice(0, 5);

        // ==========================================
        // FORMAT RECENT ATTENDANCE
        // ==========================================

        const recentAttendanceFormatted =
            recentAttendance.map(
                (attendance) => {
                    let present = 0;
                    let absent = 0;

                    if (
                        Array.isArray(
                            attendance.students
                        )
                    ) {
                        attendance.students.forEach(
                            (student) => {
                                const status =
                                    normalizeStatus(
                                        student.status
                                    );

                                if (
                                    status ===
                                    "present"
                                ) {
                                    present++;
                                } else if (
                                    status ===
                                    "absent"
                                ) {
                                    absent++;
                                }
                            }
                        );
                    }

                    const totalStudents =
                        present + absent;

                    const percentage =
                        totalStudents > 0
                            ? Number(
                                  (
                                      (present /
                                          totalStudents) *
                                      100
                                  ).toFixed(2)
                              )
                            : 0;

                    return {
                        attendanceId:
                            attendance._id,

                        classId:
                            attendance
                                .classId
                                ?._id ||
                            null,

                        className:
                            attendance
                                .classId
                                ?.className ||
                            "Unknown Class",

                        date:
                            attendance.date,

                        markedBy:
                            attendance.markedBy ||
                            null,

                        totalStudents,

                        present,

                        absent,

                        percentage,
                    };
                }
            );

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,

            // --------------------------------------
            // DASHBOARD STATISTICS
            // --------------------------------------

            statistics: {
                totalTeachers,
                totalClasses,
                totalStudents,
                totalAttendanceRecords,
                overallAttendance,
            },

            // --------------------------------------
            // CLASS-LEVEL ATTENDANCE
            //
            // Used by frontend for:
            // - Best Class
            // - Needs Attention
            // --------------------------------------

            classPerformance,

            // --------------------------------------
            // RECENT INDIVIDUAL ATTENDANCE
            //
            // Used by dashboard table.
            // --------------------------------------

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