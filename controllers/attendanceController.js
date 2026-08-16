const Attendance = require("../models/Attendance");
const Class = require("../models/Class");
const Student = require("../models/Student");
const mongoose = require("mongoose");

// ==========================================
// MARK ATTENDANCE
// POST /api/attendance
// TEACHER ONLY
// ==========================================

const markAttendance = async (req, res) => {
    try {
        const { classId, date, students } = req.body;

        if (!classId || !date || !students) {
            return res.status(400).json({
                success: false,
                message: "Class, date and students are required",
            });
        }

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Students must be a non-empty array",
            });
        }

        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid class ID",
            });
        }

        if (!req.user || req.user.role !== "teacher") {
            return res.status(403).json({
                success: false,
                message: "Only teachers can mark attendance",
            });
        }

        const teacherId = req.user.id;

        const classData = await Class.findById(classId);

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        // Teacher can only mark attendance for assigned class
        if (
            !classData.classTeacher ||
            classData.classTeacher.toString() !== teacherId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this class",
            });
        }

        const attendanceDate = new Date(date);

        if (isNaN(attendanceDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid attendance date",
            });
        }

        attendanceDate.setHours(0, 0, 0, 0);

        const existingAttendance = await Attendance.findOne({
            classId,
            date: attendanceDate,
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: "Attendance for this class and date already exists",
            });
        }

        const classStudents = await Student.find({
            classId,
            active: true,
        }).select("_id");

        const classStudentIds = classStudents.map(
            (student) => student._id.toString()
        );

        const submittedStudentIds = new Set();

        for (const record of students) {
            if (!record.studentId || !record.status) {
                return res.status(400).json({
                    success: false,
                    message: "Each student must have studentId and status",
                });
            }

            if (!mongoose.Types.ObjectId.isValid(record.studentId)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid student ID: ${record.studentId}`,
                });
            }

            if (!["Present", "Absent"].includes(record.status)) {
                return res.status(400).json({
                    success: false,
                    message: "Student status must be Present or Absent",
                });
            }

            const studentId = record.studentId.toString();

            if (submittedStudentIds.has(studentId)) {
                return res.status(400).json({
                    success: false,
                    message: "A student cannot appear more than once",
                });
            }

            submittedStudentIds.add(studentId);

            if (!classStudentIds.includes(studentId)) {
                return res.status(400).json({
                    success: false,
                    message: "One or more students do not belong to this class",
                });
            }
        }

        if (submittedStudentIds.size !== classStudentIds.length) {
            return res.status(400).json({
                success: false,
                message: "Attendance must be submitted for all active students",
            });
        }

        const attendance = await Attendance.create({
            classId,
            date: attendanceDate,
            markedBy: teacherId,
            students,
        });

        await attendance.populate([
            {
                path: "classId",
                select: "className",
            },
            {
                path: "markedBy",
                select: "name email",
            },
            {
                path: "students.studentId",
                select: "rollNo name",
            },
        ]);

        return res.status(201).json({
            success: true,
            message: "Attendance marked successfully",
            attendance,
        });

    } catch (error) {
        console.error("Mark Attendance Error:", error);

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Attendance for this class and date already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET ALL ATTENDANCE
// GET /api/attendance
// ADMIN + TEACHER
// ==========================================

const getAttendance = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        let query = {};

        // ==========================================
        // ADMIN
        // ==========================================

        if (req.user.role === "admin") {
            // Admin can view ALL attendance
            query = {};
        }

        // ==========================================
        // TEACHER
        // ==========================================

        else if (req.user.role === "teacher") {
            const teacherId = req.user.id;

            const assignedClasses = await Class.find({
                classTeacher: teacherId,
            }).select("_id");

            const classIds = assignedClasses.map(
                (classData) => classData._id
            );

            query = {
                classId: {
                    $in: classIds,
                },
            };
        }

        // ==========================================
        // OTHER ROLES
        // ==========================================

        else {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission.",
            });
        }

        const attendance = await Attendance.find(query)
            .populate("classId", "className")
            .populate("markedBy", "name email")
            .populate("students.studentId", "rollNo name")
            .sort({ date: -1 });

        return res.status(200).json({
            success: true,
            count: attendance.length,
            attendance,
        });

    } catch (error) {
        console.error("Get Attendance Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET ATTENDANCE BY ID
// GET /api/attendance/:id
// ADMIN + TEACHER
// ==========================================

const getAttendanceById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid attendance ID",
            });
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const attendance = await Attendance.findById(id)
            .populate("classId", "className")
            .populate("markedBy", "name email")
            .populate("students.studentId", "rollNo name");

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "Attendance record not found",
            });
        }

        // ==========================================
        // ADMIN
        // ==========================================

        if (req.user.role === "admin") {
            // Admin can view any attendance record
        }

        // ==========================================
        // TEACHER
        // ==========================================

        else if (req.user.role === "teacher") {
            const teacherId = req.user.id;

            const classData = await Class.findById(attendance.classId._id);

            if (!classData) {
                return res.status(404).json({
                    success: false,
                    message: "Class not found",
                });
            }

            if (
                !classData.classTeacher ||
                classData.classTeacher.toString() !== teacherId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this class",
                });
            }
        }

        // ==========================================
        // OTHER ROLES
        // ==========================================

        else {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission.",
            });
        }

        return res.status(200).json({
            success: true,
            attendance,
        });

    } catch (error) {
        console.error("Get Attendance By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET CLASS ATTENDANCE REPORT
// GET /api/attendance/report/class/:classId
// ADMIN + TEACHER
// ==========================================

const getClassAttendanceReport = async (req, res) => {
    try {
        const { classId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid class ID",
            });
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const classData = await Class.findById(classId);

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        if (req.user.role === "admin") {
            // Admin can view any class
        } else if (req.user.role === "teacher") {
            const teacherId = req.user.id;

            if (
                !classData.classTeacher ||
                classData.classTeacher.toString() !== teacherId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: "You are not assigned to this class",
                });
            }
        } else {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission.",
            });
        }

        const students = await Student.find({
            classId,
            active: true,
        })
            .select("_id rollNo name")
            .sort({ rollNo: 1 });

        const attendanceRecords = await Attendance.find({
            classId,
        }).select("date students");

        const totalClasses = attendanceRecords.length;

        const studentReports = students.map((student) => {
            let present = 0;
            let absent = 0;

            attendanceRecords.forEach((attendance) => {
                const record = attendance.students.find(
                    (item) =>
                        item.studentId.toString() ===
                        student._id.toString()
                );

                if (!record) {
                    return;
                }

                if (record.status === "Present") {
                    present++;
                } else if (record.status === "Absent") {
                    absent++;
                }
            });

            const percentage =
                totalClasses > 0
                    ? Number(((present / totalClasses) * 100).toFixed(2))
                    : 0;

            return {
                studentId: student._id,
                rollNo: student.rollNo,
                name: student.name,
                totalClasses,
                present,
                absent,
                percentage,
            };
        });

        let totalPresent = 0;
        let totalAbsent = 0;

        studentReports.forEach((student) => {
            totalPresent += student.present;
            totalAbsent += student.absent;
        });

        const totalPossibleAttendance =
            totalClasses * students.length;

        const classAverage =
            totalPossibleAttendance > 0
                ? Number(
                    (
                        (totalPresent / totalPossibleAttendance) *
                        100
                    ).toFixed(2)
                )
                : 0;

        return res.status(200).json({
            success: true,

            class: {
                _id: classData._id,
                className: classData.className,
            },

            summary: {
                totalStudents: students.length,
                totalClasses,
                totalPresent,
                totalAbsent,
                classAverage,
            },

            students: studentReports,
        });

    } catch (error) {
        console.error(
            "Get Class Attendance Report Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET STUDENT ATTENDANCE REPORT
// GET /api/attendance/report/student/:studentId
// ADMIN + TEACHER
// ==========================================

const getStudentAttendanceReport = async (req, res) => {
    try {
        const { studentId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID",
            });
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const student = await Student.findById(studentId)
            .populate("classId", "className");

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        if (!student.classId) {
            return res.status(404).json({
                success: false,
                message: "Student is not assigned to a class",
            });
        }

        const classData = await Class.findById(student.classId._id);

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        if (req.user.role === "admin") {
            // Admin can view any student
        } else if (req.user.role === "teacher") {
            const teacherId = req.user.id;

            if (
                !classData.classTeacher ||
                classData.classTeacher.toString() !== teacherId.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You are not assigned to this student's class",
                });
            }
        } else {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission.",
            });
        }

        const attendanceRecords = await Attendance.find({
            classId: student.classId._id,
        })
            .select("date students")
            .sort({ date: 1 });

        let present = 0;
        let absent = 0;

        const attendanceHistory = [];

        attendanceRecords.forEach((attendance) => {
            const record = attendance.students.find(
                (item) =>
                    item.studentId.toString() ===
                    student._id.toString()
            );

            if (!record) {
                return;
            }

            if (record.status === "Present") {
                present++;
            } else if (record.status === "Absent") {
                absent++;
            }

            attendanceHistory.push({
                attendanceId: attendance._id,
                date: attendance.date,
                status: record.status,
            });
        });

        const totalClasses = attendanceHistory.length;

        const percentage =
            totalClasses > 0
                ? Number(((present / totalClasses) * 100).toFixed(2))
                : 0;

        return res.status(200).json({
            success: true,

            student: {
                _id: student._id,
                rollNo: student.rollNo,
                name: student.name,
                classId: student.classId._id,
                className: student.classId.className,
            },

            summary: {
                totalClasses,
                present,
                absent,
                percentage,
            },

            attendance: attendanceHistory,
        });

    } catch (error) {
        console.error(
            "Get Student Attendance Report Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET DATE ATTENDANCE REPORT
// GET /api/attendance/report/date/:date
// ADMIN + TEACHER
// ==========================================

const getDateAttendanceReport = async (req, res) => {
    try {
        const { date } = req.params;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date. Use YYYY-MM-DD",
            });
        }

        const startDate = new Date(`${date}T00:00:00.000Z`);
        const endDate = new Date(`${date}T23:59:59.999Z`);

        if (
            isNaN(startDate.getTime()) ||
            isNaN(endDate.getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid date. Use YYYY-MM-DD",
            });
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        let attendanceRecords = await Attendance.find({
            date: {
                $gte: startDate,
                $lte: endDate,
            },
        })
            .populate("classId", "className")
            .populate("markedBy", "name email")
            .populate("students.studentId", "rollNo name");

        if (req.user.role === "teacher") {
            const teacherId = req.user.id;

            const assignedClasses = await Class.find({
                classTeacher: teacherId,
            }).select("_id");

            const assignedClassIds = assignedClasses.map(
                (classData) => classData._id.toString()
            );

            attendanceRecords = attendanceRecords.filter(
                (attendance) =>
                    attendance.classId &&
                    assignedClassIds.includes(
                        attendance.classId._id.toString()
                    )
            );
        } else if (req.user.role === "admin") {
            // Admin can view all classes
        } else {
            return res.status(403).json({
                success: false,
                message: "Access denied. You do not have permission.",
            });
        }

        const classes = attendanceRecords.map((attendance) => {
            let present = 0;
            let absent = 0;

            attendance.students.forEach((student) => {
                if (student.status === "Present") {
                    present++;
                } else if (student.status === "Absent") {
                    absent++;
                }
            });

            const totalStudents = attendance.students.length;

            const percentage =
                totalStudents > 0
                    ? Number(
                        ((present / totalStudents) * 100).toFixed(2)
                    )
                    : 0;

            return {
                attendanceId: attendance._id,
                classId: attendance.classId._id,
                className: attendance.classId.className,
                markedBy: attendance.markedBy,
                totalStudents,
                present,
                absent,
                percentage,
            };
        });

        let totalStudents = 0;
        let totalPresent = 0;
        let totalAbsent = 0;

        classes.forEach((classReport) => {
            totalStudents += classReport.totalStudents;
            totalPresent += classReport.present;
            totalAbsent += classReport.absent;
        });

        const overallPercentage =
            totalStudents > 0
                ? Number(
                    ((totalPresent / totalStudents) * 100).toFixed(2)
                )
                : 0;

        return res.status(200).json({
            success: true,
            date,

            summary: {
                totalClasses: classes.length,
                totalStudents,
                totalPresent,
                totalAbsent,
                overallPercentage,
            },

            classes,
        });

    } catch (error) {
        console.error(
            "Get Date Attendance Report Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// UPDATE ATTENDANCE
// PUT /api/attendance/:id
// TEACHER ONLY
// ==========================================

const updateAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { students } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid attendance ID",
            });
        }

        if (!req.user || req.user.role !== "teacher") {
            return res.status(403).json({
                success: false,
                message: "Only teachers can update attendance",
            });
        }

        const teacherId = req.user.id;

        if (!Array.isArray(students) || students.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Students must be a non-empty array",
            });
        }

        const attendance = await Attendance.findById(id);

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "Attendance record not found",
            });
        }

        const classData = await Class.findById(attendance.classId);

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        if (
            !classData.classTeacher ||
            classData.classTeacher.toString() !== teacherId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You are not assigned to this class",
            });
        }

        const classStudents = await Student.find({
            classId: attendance.classId,
            active: true,
        }).select("_id");

        const classStudentIds = classStudents.map(
            (student) => student._id.toString()
        );

        const submittedStudentIds = new Set();

        for (const record of students) {
            if (!record.studentId || !record.status) {
                return res.status(400).json({
                    success: false,
                    message: "Each student must have studentId and status",
                });
            }

            if (!mongoose.Types.ObjectId.isValid(record.studentId)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid student ID: ${record.studentId}`,
                });
            }

            if (!["Present", "Absent"].includes(record.status)) {
                return res.status(400).json({
                    success: false,
                    message: "Student status must be Present or Absent",
                });
            }

            const studentId = record.studentId.toString();

            if (submittedStudentIds.has(studentId)) {
                return res.status(400).json({
                    success: false,
                    message: "A student cannot appear more than once",
                });
            }

            submittedStudentIds.add(studentId);

            if (!classStudentIds.includes(studentId)) {
                return res.status(400).json({
                    success: false,
                    message: "One or more students do not belong to this class",
                });
            }
        }

        if (submittedStudentIds.size !== classStudentIds.length) {
            return res.status(400).json({
                success: false,
                message: "Attendance must include all active students",
            });
        }

        attendance.students = students;

        await attendance.save();

        await attendance.populate([
            {
                path: "classId",
                select: "className",
            },
            {
                path: "markedBy",
                select: "name email",
            },
            {
                path: "students.studentId",
                select: "rollNo name",
            },
        ]);

        return res.status(200).json({
            success: true,
            message: "Attendance updated successfully",
            attendance,
        });

    } catch (error) {
        console.error("Update Attendance Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// DELETE ATTENDANCE
// DELETE /api/attendance/:id
// ADMIN ONLY
// ==========================================

const deleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid attendance ID",
            });
        }

        const attendance = await Attendance.findById(id);

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "Attendance record not found",
            });
        }

        await Attendance.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Attendance deleted successfully",
        });

    } catch (error) {
        console.error("Delete Attendance Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// EXPORT FUNCTIONS
// ==========================================

module.exports = {
    markAttendance,
    getAttendance,
    getAttendanceById,
    getClassAttendanceReport,
    getStudentAttendanceReport,
    getDateAttendanceReport,
    updateAttendance,
    deleteAttendance,
};