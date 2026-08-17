const Attendance = require("../models/Attendance");
const Class = require("../models/Class");
const Student = require("../models/Student");
const mongoose = require("mongoose");


// ==========================================
// DATE HELPERS
// ==========================================

const normalizeDate = (date) => {

    if (!date) {
        return null;
    }

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {

        const [year, month, day] =
            date.split("-").map(Number);

        return new Date(
            year,
            month - 1,
            day,
            0,
            0,
            0,
            0
        );
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    parsed.setHours(
        0,
        0,
        0,
        0
    );

    return parsed;
};


// ==========================================
// FORMAT DATE
// ==========================================

const formatDate = (date) => {

    if (!date) {
        return "";
    }

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
        return "";
    }

    const year =
        parsed.getFullYear();

    const month =
        String(
            parsed.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            parsed.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;
};


// ==========================================
// CHECK USER ACCESS TO CLASS
// ==========================================

const checkClassAccess = async (
    req,
    classData
) => {

    if (!req.user) {

        return {
            allowed: false,
            status: 401,
            message:
                "Authentication required",
        };
    }


    // ADMIN
    if (
        req.user.role === "admin"
    ) {

        return {
            allowed: true,
        };
    }


    // TEACHER
    if (
        req.user.role === "teacher"
    ) {

        if (
            !classData.classTeacher ||
            classData.classTeacher.toString() !==
                req.user.id.toString()
        ) {

            return {
                allowed: false,
                status: 403,
                message:
                    "You are not assigned to this class",
            };
        }


        return {
            allowed: true,
        };
    }


    return {
        allowed: false,
        status: 403,
        message:
            "Access denied. You do not have permission.",
    };
};


// ==========================================
// VALIDATE STUDENT RECORDS
// ==========================================

const validateStudentRecords = async (
    classId,
    students
) => {

    if (
        !Array.isArray(students) ||
        students.length === 0
    ) {

        return {
            valid: false,
            status: 400,
            message:
                "Students must be a non-empty array",
        };
    }


    const classStudents =
        await Student.find({
            classId,
            active: true,
        }).select("_id");


    const classStudentIds =
        classStudents.map(
            (student) =>
                student._id.toString()
        );


    const submittedStudentIds =
        new Set();


    for (
        const record of students
    ) {

        if (
            !record.studentId ||
            !record.status
        ) {

            return {
                valid: false,
                status: 400,
                message:
                    "Each student must have studentId and status",
            };
        }


        if (
            !mongoose.Types.ObjectId.isValid(
                record.studentId
            )
        ) {

            return {
                valid: false,
                status: 400,
                message:
                    `Invalid student ID: ${record.studentId}`,
            };
        }


        if (
            ![
                "Present",
                "Absent",
            ].includes(
                record.status
            )
        ) {

            return {
                valid: false,
                status: 400,
                message:
                    "Student status must be Present or Absent",
            };
        }


        const studentId =
            record.studentId.toString();


        if (
            submittedStudentIds.has(
                studentId
            )
        ) {

            return {
                valid: false,
                status: 400,
                message:
                    "A student cannot appear more than once",
            };
        }


        submittedStudentIds.add(
            studentId
        );


        if (
            !classStudentIds.includes(
                studentId
            )
        ) {

            return {
                valid: false,
                status: 400,
                message:
                    "One or more students do not belong to this class",
            };
        }
    }


    if (
        submittedStudentIds.size !==
        classStudentIds.length
    ) {

        return {
            valid: false,
            status: 400,
            message:
                "Attendance must include all active students",
        };
    }


    return {
        valid: true,
    };
};


// ==========================================
// MARK ATTENDANCE
// POST /api/attendance
// ADMIN + TEACHER
// ==========================================

const markAttendance = async (
    req,
    res
) => {

    try {

        const {
            classId,
            date,
            students,
        } = req.body;


        if (
            !classId ||
            !date ||
            !students
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Class, date and students are required",
            });
        }


        if (
            !mongoose.Types.ObjectId.isValid(
                classId
            )
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid class ID",
            });
        }


        const attendanceDate =
            normalizeDate(date);


        if (!attendanceDate) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid attendance date",
            });
        }


        const classData =
            await Class.findById(
                classId
            );


        if (!classData) {

            return res.status(404).json({
                success: false,
                message:
                    "Class not found",
            });
        }


        const access =
            await checkClassAccess(
                req,
                classData
            );


        if (!access.allowed) {

            return res.status(
                access.status
            ).json({
                success: false,
                message:
                    access.message,
            });
        }


        const validation =
            await validateStudentRecords(
                classId,
                students
            );


        if (!validation.valid) {

            return res.status(
                validation.status
            ).json({
                success: false,
                message:
                    validation.message,
            });
        }


        // ======================================
        // CHECK EXISTING RECORD
        // ======================================

        const existingAttendance =
            await Attendance.findOne({
                classId,
                date: attendanceDate,
            });


        // ======================================
        // UPDATE EXISTING
        // ======================================

        if (existingAttendance) {

            existingAttendance.students =
                students;


            await existingAttendance.save();


            await existingAttendance.populate([
                {
                    path: "classId",
                    select:
                        "className classTeacher",
                },
                {
                    path: "markedBy",
                    select:
                        "name email",
                },
                {
                    path: "students.studentId",
                    select:
                        "rollNo name",
                },
            ]);


            return res.status(200).json({

                success: true,

                message:
                    "Attendance updated successfully",

                attendance:
                    existingAttendance,
            });
        }


        // ======================================
        // CREATE
        // ======================================

        const attendance =
            await Attendance.create({

                classId,

                date:
                    attendanceDate,

                markedBy:
                    req.user.id,

                students,
            });


        await attendance.populate([
            {
                path: "classId",
                select:
                    "className classTeacher",
            },
            {
                path: "markedBy",
                select:
                    "name email",
            },
            {
                path: "students.studentId",
                select:
                    "rollNo name",
            },
        ]);


        return res.status(201).json({

            success: true,

            message:
                "Attendance marked successfully",

            attendance,
        });

    } catch (error) {

        console.error(
            "Mark Attendance Error:",
            error
        );


        if (
            error.code === 11000
        ) {

            return res.status(200).json({

                success: true,

                message:
                    "Attendance already existed and was updated",
            });
        }


        return res.status(500).json({

            success: false,

            message:
                "Server error",
        });
    }
};


// ==========================================
// GET ALL ATTENDANCE
// GET /api/attendance
// ==========================================

const getAttendance = async (
    req,
    res
) => {

    try {

        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required",
            });
        }


        let query = {};


        // ======================================
        // ADMIN
        // ======================================

        if (
            req.user.role === "admin"
        ) {

            query = {};
        }


        // ======================================
        // TEACHER
        // ======================================

        else if (
            req.user.role === "teacher"
        ) {

            const assignedClasses =
                await Class.find({
                    classTeacher:
                        req.user.id,
                }).select("_id");


            const classIds =
                assignedClasses.map(
                    (classData) =>
                        classData._id
                );


            query = {

                classId: {
                    $in:
                        classIds,
                },
            };
        }


        else {

            return res.status(403).json({

                success: false,

                message:
                    "Access denied. You do not have permission.",
            });
        }


        // ======================================
        // CLASS FILTER
        // ======================================

        if (
            req.query.classId
        ) {

            if (
                !mongoose.Types.ObjectId.isValid(
                    req.query.classId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid class ID",
                });
            }


            // ----------------------------------
            // Teacher security check
            // ----------------------------------

            if (
                req.user.role ===
                "teacher"
            ) {

                const teacherClass =
                    await Class.findOne({

                        _id:
                            req.query.classId,

                        classTeacher:
                            req.user.id,
                    });


                if (!teacherClass) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "You can only view attendance for your assigned class",
                    });
                }
            }


            query.classId =
                req.query.classId;
        }


        // ======================================
        // DATE FILTER
        // ======================================

        if (
            req.query.date
        ) {

            const requestedDate =
                normalizeDate(
                    req.query.date
                );


            if (!requestedDate) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid date",
                });
            }


            const nextDate =
                new Date(
                    requestedDate
                );


            nextDate.setDate(
                nextDate.getDate() + 1
            );


            query.date = {

                $gte:
                    requestedDate,

                $lt:
                    nextDate,
            };
        }


        const attendance =
            await Attendance.find(
                query
            )
                .populate(
                    "classId",
                    "className classTeacher"
                )
                .populate(
                    "markedBy",
                    "name email"
                )
                .populate(
                    "students.studentId",
                    "rollNo name"
                )
                .sort({
                    date: -1,
                });


        return res.status(200).json({

            success: true,

            count:
                attendance.length,

            attendance,
        });

    } catch (error) {

        console.error(
            "Get Attendance Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error",
        });
    }
};


// ==========================================
// GET ATTENDANCE BY ID
// GET /api/attendance/:id
// ==========================================

const getAttendanceById = async (
    req,
    res
) => {

    try {

        const { id } =
            req.params;


        if (
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid attendance ID",
            });
        }


        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required",
            });
        }


        const attendance =
            await Attendance.findById(
                id
            )
                .populate(
                    "classId",
                    "className classTeacher"
                )
                .populate(
                    "markedBy",
                    "name email"
                )
                .populate(
                    "students.studentId",
                    "rollNo name"
                );


        if (!attendance) {

            return res.status(404).json({

                success: false,

                message:
                    "Attendance record not found",
            });
        }


        const classData =
            await Class.findById(
                attendance.classId._id
            );


        if (!classData) {

            return res.status(404).json({

                success: false,

                message:
                    "Class not found",
            });
        }


        const access =
            await checkClassAccess(
                req,
                classData
            );


        if (!access.allowed) {

            return res.status(
                access.status
            ).json({

                success: false,

                message:
                    access.message,
            });
        }


        return res.status(200).json({

            success: true,

            attendance,
        });

    } catch (error) {

        console.error(
            "Get Attendance By ID Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error",
        });
    }
};


// ==========================================
// UPDATE ATTENDANCE
// PUT /api/attendance/:id
// ==========================================

const updateAttendance = async (
    req,
    res
) => {

    try {

        const { id } =
            req.params;

        const { students } =
            req.body;


        if (
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid attendance ID",
            });
        }


        if (
            !Array.isArray(
                students
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Students must be an array",
            });
        }


        if (!req.user) {

            return res.status(401).json({

                success: false,

                message:
                    "Authentication required",
            });
        }


        const attendance =
            await Attendance.findById(
                id
            );


        if (!attendance) {

            return res.status(404).json({

                success: false,

                message:
                    "Attendance record not found",
            });
        }


        const classData =
            await Class.findById(
                attendance.classId
            );


        if (!classData) {

            return res.status(404).json({

                success: false,

                message:
                    "Class not found",
            });
        }


        const access =
            await checkClassAccess(
                req,
                classData
            );


        if (!access.allowed) {

            return res.status(
                access.status
            ).json({

                success: false,

                message:
                    access.message,
            });
        }


        const validation =
            await validateStudentRecords(
                attendance.classId,
                students
            );


        if (!validation.valid) {

            return res.status(
                validation.status
            ).json({

                success: false,

                message:
                    validation.message,
            });
        }


        attendance.students =
            students;


        await attendance.save();


        await attendance.populate([
            {
                path: "classId",
                select:
                    "className classTeacher",
            },
            {
                path: "markedBy",
                select:
                    "name email",
            },
            {
                path: "students.studentId",
                select:
                    "rollNo name",
            },
        ]);


        return res.status(200).json({

            success: true,

            message:
                "Attendance updated successfully",

            attendance,
        });

    } catch (error) {

        console.error(
            "Update Attendance Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error",
        });
    }
};


// ==========================================
// GET CLASS ATTENDANCE REPORT
// ==========================================

const getClassAttendanceReport =
    async (
        req,
        res
    ) => {

        try {

            const { classId } =
                req.params;


            if (
                !mongoose.Types.ObjectId.isValid(
                    classId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid class ID",
                });
            }


            if (!req.user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required",
                });
            }


            const classData =
                await Class.findById(
                    classId
                );


            if (!classData) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Class not found",
                });
            }


            const access =
                await checkClassAccess(
                    req,
                    classData
                );


            if (!access.allowed) {

                return res.status(
                    access.status
                ).json({

                    success: false,

                    message:
                        access.message,
                });
            }


            const students =
                await Student.find({

                    classId,

                    active: true,

                })
                    .select(
                        "_id rollNo name"
                    )
                    .sort({
                        rollNo: 1,
                    });


            const attendanceRecords =
                await Attendance.find({

                    classId,

                }).select(
                    "date students"
                );


            const totalClasses =
                attendanceRecords.length;


            const studentReports =
                students.map(
                    (student) => {

                        let present = 0;

                        let absent = 0;


                        attendanceRecords.forEach(
                            (
                                attendance
                            ) => {

                                const record =
                                    attendance.students.find(
                                        (item) =>
                                            item.studentId.toString() ===
                                            student._id.toString()
                                    );


                                if (!record) {
                                    return;
                                }


                                if (
                                    record.status ===
                                    "Present"
                                ) {

                                    present++;
                                }


                                if (
                                    record.status ===
                                    "Absent"
                                ) {

                                    absent++;
                                }
                            }
                        );


                        const percentage =
                            totalClasses > 0

                                ? Number(
                                      (
                                          (present /
                                              totalClasses) *
                                          100
                                      ).toFixed(2)
                                  )

                                : 0;


                        return {

                            studentId:
                                student._id,

                            rollNo:
                                student.rollNo,

                            name:
                                student.name,

                            totalClasses,

                            present,

                            absent,

                            percentage,
                        };
                    }
                );


            let totalPresent = 0;

            let totalAbsent = 0;


            studentReports.forEach(
                (student) => {

                    totalPresent +=
                        student.present;

                    totalAbsent +=
                        student.absent;
                }
            );


            const totalPossibleAttendance =
                totalClasses *
                students.length;


            const classAverage =
                totalPossibleAttendance > 0

                    ? Number(
                          (
                              (totalPresent /
                                  totalPossibleAttendance) *
                              100
                          ).toFixed(2)
                      )

                    : 0;


            return res.status(200).json({

                success: true,

                class: {

                    _id:
                        classData._id,

                    className:
                        classData.className,

                    classTeacher:
                        classData.classTeacher,
                },

                summary: {

                    totalStudents:
                        students.length,

                    totalClasses,

                    totalPresent,

                    totalAbsent,

                    classAverage,
                },

                students:
                    studentReports,
            });

        } catch (error) {

            console.error(
                "Get Class Attendance Report Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Server error",
            });
        }
    };


// ==========================================
// GET STUDENT ATTENDANCE REPORT
// ==========================================

const getStudentAttendanceReport =
    async (
        req,
        res
    ) => {

        try {

            const { studentId } =
                req.params;


            if (
                !mongoose.Types.ObjectId.isValid(
                    studentId
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid student ID",
                });
            }


            if (!req.user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required",
                });
            }


            const student =
                await Student.findById(
                    studentId
                ).populate(
                    "classId",
                    "className"
                );


            if (!student) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Student not found",
                });
            }


            if (!student.classId) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Student is not assigned to a class",
                });
            }


            const classData =
                await Class.findById(
                    student.classId._id
                );


            if (!classData) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Class not found",
                });
            }


            const access =
                await checkClassAccess(
                    req,
                    classData
                );


            if (!access.allowed) {

                return res.status(
                    access.status
                ).json({

                    success: false,

                    message:
                        access.message,
                });
            }


            const attendanceRecords =
                await Attendance.find({

                    classId:
                        student.classId._id,

                })
                    .select(
                        "date students"
                    )
                    .sort({
                        date: 1,
                    });


            let present = 0;

            let absent = 0;


            const attendanceHistory =
                [];


            attendanceRecords.forEach(
                (attendance) => {

                    const record =
                        attendance.students.find(
                            (item) =>
                                item.studentId.toString() ===
                                student._id.toString()
                        );


                    if (!record) {
                        return;
                    }


                    if (
                        record.status ===
                        "Present"
                    ) {

                        present++;
                    }


                    if (
                        record.status ===
                        "Absent"
                    ) {

                        absent++;
                    }


                    attendanceHistory.push({

                        attendanceId:
                            attendance._id,

                        date:
                            attendance.date,

                        status:
                            record.status,
                    });
                }
            );


            const totalClasses =
                attendanceHistory.length;


            const percentage =
                totalClasses > 0

                    ? Number(
                          (
                              (present /
                                  totalClasses) *
                              100
                          ).toFixed(2)
                      )

                    : 0;


            return res.status(200).json({

                success: true,

                student: {

                    _id:
                        student._id,

                    rollNo:
                        student.rollNo,

                    name:
                        student.name,

                    classId:
                        student.classId._id,

                    className:
                        student.classId
                            .className,
                },

                summary: {

                    totalClasses,

                    present,

                    absent,

                    percentage,
                },

                attendance:
                    attendanceHistory,
            });

        } catch (error) {

            console.error(
                "Get Student Attendance Report Error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Server error",
            });
        }
    };


// ==========================================
// GET DATE ATTENDANCE REPORT
//
// GET:
// /api/attendance/report/date/:date
//
// Optional:
// ?classId=CLASS_ID
//
// ADMIN:
// - Can select any class
// - Can select any date
//
// TEACHER:
// - Can only see assigned class
// - Cannot access another teacher's class
// ==========================================

const getDateAttendanceReport =
    async (
        req,
        res
    ) => {

        try {

            const { date } =
                req.params;


            const { classId } =
                req.query;


            // ======================================
            // VALIDATE DATE
            // ======================================

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    date
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid date. Use YYYY-MM-DD",
                });
            }


            const startDate =
                normalizeDate(
                    date
                );


            if (!startDate) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid date",
                });
            }


            const endDate =
                new Date(
                    startDate
                );


            endDate.setDate(
                endDate.getDate() + 1
            );


            // ======================================
            // AUTHENTICATION
            // ======================================

            if (!req.user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required",
                });
            }


            // ======================================
            // ROLE VALIDATION
            // ======================================

            if (
                req.user.role !== "admin" &&
                req.user.role !== "teacher"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Access denied. You do not have permission.",
                });
            }


            // ======================================
            // BUILD QUERY
            // ======================================

            const query = {

                date: {

                    $gte:
                        startDate,

                    $lt:
                        endDate,
                },
            };


            // ======================================
            // TEACHER
            // ======================================

            if (
                req.user.role ===
                "teacher"
            ) {

                const assignedClasses =
                    await Class.find({

                        classTeacher:
                            req.user.id,

                    }).select(
                        "_id className classTeacher"
                    );


                if (
                    assignedClasses.length === 0
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "You are not assigned to any class",
                    });
                }


                const assignedClassIds =
                    assignedClasses.map(
                        (classData) =>
                            classData._id.toString()
                    );


                // --------------------------------------
                // TEACHER SELECTED CLASS
                // --------------------------------------

                if (classId) {

                    if (
                        !mongoose.Types.ObjectId.isValid(
                            classId
                        )
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "Invalid class ID",
                        });
                    }


                    if (
                        !assignedClassIds.includes(
                            classId.toString()
                        )
                    ) {

                        return res.status(403).json({

                            success: false,

                            message:
                                "You can only view reports for your assigned class",
                        });
                    }


                    query.classId =
                        classId;

                } else {

                    query.classId = {

                        $in:
                            assignedClasses.map(
                                (classData) =>
                                    classData._id
                            ),
                    };
                }
            }


            // ======================================
            // ADMIN
            // ======================================

            if (
                req.user.role ===
                "admin"
            ) {

                if (classId) {

                    if (
                        !mongoose.Types.ObjectId.isValid(
                            classId
                        )
                    ) {

                        return res.status(400).json({

                            success: false,

                            message:
                                "Invalid class ID",
                        });
                    }


                    const classExists =
                        await Class.exists({
                            _id:
                                classId,
                        });


                    if (!classExists) {

                        return res.status(404).json({

                            success: false,

                            message:
                                "Class not found",
                        });
                    }


                    query.classId =
                        classId;
                }
            }


            // ======================================
            // GET ATTENDANCE RECORDS
            // ======================================

            const attendanceRecords =
                await Attendance.find(
                    query
                )
                    .populate(
                        "classId",
                        "className classTeacher"
                    )
                    .populate(
                        "markedBy",
                        "name email"
                    )
                    .populate(
                        "students.studentId",
                        "rollNo name"
                    )
                    .sort({
                        date: 1,
                    });


            // ======================================
            // BUILD CLASS REPORTS
            // ======================================

            const classes =
                attendanceRecords.map(
                    (attendance) => {

                        let present = 0;

                        let absent = 0;


                        // ----------------------------------
                        // STUDENT DETAILS
                        // ----------------------------------

                        const students =
                            attendance.students.map(
                                (record) => {

                                    if (
                                        record.status ===
                                        "Present"
                                    ) {

                                        present++;
                                    }


                                    if (
                                        record.status ===
                                        "Absent"
                                    ) {

                                        absent++;
                                    }


                                    return {

                                        studentId:
                                            record
                                                .studentId
                                                ?._id ||
                                            record.studentId,

                                        rollNo:
                                            record
                                                .studentId
                                                ?.rollNo ||
                                            "-",

                                        name:
                                            record
                                                .studentId
                                                ?.name ||
                                            "Unknown Student",

                                        status:
                                            record.status,
                                    };
                                }
                            );


                        const totalStudents =
                            students.length;


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

                            date:
                                formatDate(
                                    attendance.date
                                ),

                            classId:
                                attendance
                                    .classId
                                    ?._id ||
                                null,

                            className:
                                attendance
                                    .classId
                                    ?.className ||
                                "Unknown",

                            markedBy:
                                attendance.markedBy,

                            totalStudents,

                            present,

                            absent,

                            percentage,

                            students,
                        };
                    }
                );


            // ======================================
            // OVERALL SUMMARY
            // ======================================

            let totalStudents = 0;

            let totalPresent = 0;

            let totalAbsent = 0;


            classes.forEach(
                (classReport) => {

                    totalStudents +=
                        classReport.totalStudents;

                    totalPresent +=
                        classReport.present;

                    totalAbsent +=
                        classReport.absent;
                }
            );


            const totalAttendance =
                totalPresent +
                totalAbsent;


            const overallPercentage =
                totalAttendance > 0

                    ? Number(
                          (
                              (totalPresent /
                                  totalAttendance) *
                              100
                          ).toFixed(2)
                      )

                    : 0;


            // ======================================
            // RESPONSE
            // ======================================

            return res.status(200).json({

                success: true,

                date,

                selectedClass:
                    classId || null,

                summary: {

                    totalClasses:
                        classes.length,

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

                message:
                    "Server error",
            });
        }
    };


// ==========================================
// DELETE ATTENDANCE
// DELETE /api/attendance/:id
// ADMIN ONLY
// ==========================================

const deleteAttendance = async (
    req,
    res
) => {

    try {

        const { id } =
            req.params;


        if (
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid attendance ID",
            });
        }


        if (
            !req.user ||
            req.user.role !== "admin"
        ) {

            return res.status(403).json({

                success: false,

                message:
                    "Only admin can delete attendance",
            });
        }


        const attendance =
            await Attendance.findById(
                id
            );


        if (!attendance) {

            return res.status(404).json({

                success: false,

                message:
                    "Attendance record not found",
            });
        }


        await Attendance.findByIdAndDelete(
            id
        );


        return res.status(200).json({

            success: true,

            message:
                "Attendance deleted successfully",
        });

    } catch (error) {

        console.error(
            "Delete Attendance Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Server error",
        });
    }
};


// ==========================================
// EXPORT
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