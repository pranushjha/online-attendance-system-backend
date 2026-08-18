const Student = require("../models/Student");
const Class = require("../models/Class");
const mongoose = require("mongoose");
const XLSX = require("xlsx");


// ==========================================
// HELPER:
// GET TEACHER'S ASSIGNED CLASS
// ==========================================

const getTeacherAssignedClass = async (req) => {

    if (req.user?.role !== "teacher") {
        return null;
    }

    if (!req.user?.id) {
        return null;
    }

    const teacherClass = await Class.findOne({
        classTeacher: req.user.id,
    }).select("_id className classTeacher");

    return teacherClass;
};


// ==========================================
// HELPER:
// CHECK CLASS ACCESS
// ==========================================

const teacherHasClassAccess = (
    teacherClass,
    classId
) => {

    if (!teacherClass || !classId) {
        return false;
    }

    return (
        String(teacherClass._id) ===
        String(classId)
    );
};


// ==========================================
// HELPER:
// NORMALIZE ACTIVE VALUE
// ==========================================

const normalizeActiveValue = (value) => {

    if (typeof value === "boolean") {

        return {
            valid: true,
            value,
        };

    }


    if (typeof value === "string") {

        const normalized =
            value.trim().toLowerCase();


        if (
            normalized === "true" ||
            normalized === "1" ||
            normalized === "active"
        ) {

            return {
                valid: true,
                value: true,
            };

        }


        if (
            normalized === "false" ||
            normalized === "0" ||
            normalized === "inactive"
        ) {

            return {
                valid: true,
                value: false,
            };

        }

    }


    return {
        valid: false,
        value: null,
    };

};


// ==========================================
// CREATE STUDENT
// POST /api/students
// ==========================================

const createStudent = async (req, res) => {

    try {

        const {
            rollNo,
            name,
            classId,
        } = req.body;


        if (
            rollNo === undefined ||
            name === undefined ||
            !classId
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Roll number, name and class are required",

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


        const normalizedRollNo =
            String(rollNo).trim();

        const normalizedName =
            String(name).trim();


        if (!normalizedRollNo) {

            return res.status(400).json({

                success: false,

                message:
                    "Roll number cannot be empty",

            });

        }


        if (!normalizedName) {

            return res.status(400).json({

                success: false,

                message:
                    "Student name cannot be empty",

            });

        }


        // ==========================================
        // CHECK CLASS EXISTS
        // ==========================================

        const classData =
            await Class.findById(classId);


        if (!classData) {

            return res.status(404).json({

                success: false,

                message:
                    "Class not found",

            });

        }


        // ==========================================
        // TEACHER CLASS ACCESS
        // ==========================================

        if (
            req.user.role === "teacher"
        ) {

            const teacherClass =
                await getTeacherAssignedClass(
                    req
                );


            if (!teacherClass) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not assigned to any class",

                });

            }


            if (
                !teacherHasClassAccess(
                    teacherClass,
                    classId
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You can only manage students from your assigned class",

                });

            }

        }


        // ==========================================
        // DUPLICATE ROLL NUMBER
        //
        // IMPORTANT:
        // Roll number is unique PER CLASS.
        //
        // Therefore:
        //
        // Class A + Roll 1 = allowed
        // Class B + Roll 1 = allowed
        // Class A + Roll 1 again = rejected
        // ==========================================

        const existingStudent =
            await Student.findOne({

                classId,

                rollNo:
                    normalizedRollNo,

            });


        if (existingStudent) {

            return res.status(400).json({

                success: false,

                message:
                    `Roll number "${normalizedRollNo}" already exists in this class`,

            });

        }


        // ==========================================
        // CREATE STUDENT
        // ==========================================

        const student =
            await Student.create({

                rollNo:
                    normalizedRollNo,

                name:
                    normalizedName,

                classId,

                active: true,

            });


        await student.populate(
            "classId",
            "className"
        );


        return res.status(201).json({

            success: true,

            message:
                "Student created successfully",

            student: {

                _id:
                    student._id,

                rollNo:
                    student.rollNo,

                name:
                    student.name,

                classId:
                    student.classId,

                active:
                    student.active === true,

            },

        });

    } catch (error) {

        console.error(
            "Create Student Error:",
            error
        );


        if (
            error.code === 11000
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This roll number already exists in the selected class",

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
// BULK CREATE / UPDATE STUDENTS
// POST /api/students/bulk
// ==========================================

const bulkUploadStudents = async (
    req,
    res
) => {

    try {

        if (!req.file) {

            return res.status(400).json({

                success: false,

                message:
                    "Excel file is required",

            });

        }


        const fileName =
            req.file.originalname.toLowerCase();


        if (
            !fileName.endsWith(".xlsx") &&
            !fileName.endsWith(".xls")
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Only .xlsx and .xls Excel files are allowed",

            });

        }


        const workbook =
            XLSX.read(
                req.file.buffer,
                {
                    type: "buffer",
                }
            );


        if (
            !workbook.SheetNames.length
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Excel file contains no sheets",

            });

        }


        const worksheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];


        const rows =
            XLSX.utils.sheet_to_json(
                worksheet,
                {
                    defval: "",
                    raw: false,
                }
            );


        if (!rows.length) {

            return res.status(400).json({

                success: false,

                message:
                    "Excel file contains no student data",

            });

        }


        // ==========================================
        // NORMALIZE HEADERS
        // ==========================================

        const normalizeHeader = (
            header
        ) => {

            return String(header)
                .trim()
                .toLowerCase()
                .replace(
                    /[\s_-]+/g,
                    ""
                );

        };


        const normalizedRows =
            rows.map(
                (row, index) => {

                    const rowData = {};


                    Object.keys(row).forEach(
                        (key) => {

                            rowData[
                                normalizeHeader(key)
                            ] = row[key];

                        }
                    );


                    return {

                        rowNumber:
                            index + 2,

                        rollNo:
                            rowData.roll ||
                            rowData.rollno ||
                            rowData.rollnumber ||
                            "",

                        name:
                            rowData.name ||
                            rowData.studentname ||
                            "",

                        className:
                            rowData.class ||
                            rowData.classname ||
                            "",

                        status:
                            rowData.status ||
                            "",

                    };

                }
            );


        // ==========================================
        // GET TEACHER CLASS
        // ==========================================

        let teacherClass = null;


        if (
            req.user.role === "teacher"
        ) {

            teacherClass =
                await getTeacherAssignedClass(
                    req
                );


            if (!teacherClass) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not assigned to any class",

                });

            }

        }


        // ==========================================
        // VALIDATE ROWS
        // ==========================================

        const errors = [];
        const validRows = [];

        // IMPORTANT:
        // Duplicate is checked using
        // CLASS + ROLL NUMBER
        const rollNumbersInExcel =
            new Set();


        for (
            const row of normalizedRows
        ) {

            const rollNo =
                String(row.rollNo).trim();

            const name =
                String(row.name).trim();

            const className =
                String(row.className).trim();

            const status =
                String(row.status).trim();


            // ======================================
            // ROLL NUMBER
            // ======================================

            if (!rollNo) {

                errors.push({

                    row:
                        row.rowNumber,

                    message:
                        "Roll number is required",

                });

                continue;

            }


            // ======================================
            // NAME
            // ======================================

            if (!name) {

                errors.push({

                    row:
                        row.rowNumber,

                    message:
                        "Student name is required",

                });

                continue;

            }


            // ======================================
            // CLASS
            // ======================================

            if (!className) {

                errors.push({

                    row:
                        row.rowNumber,

                    message:
                        "Class is required",

                });

                continue;

            }


            // ======================================
            // TEACHER CLASS CHECK
            // ======================================

            if (
                req.user.role === "teacher"
            ) {

                const excelClass =
                    className.toLowerCase();

                const assignedClass =
                    teacherClass.className
                        .trim()
                        .toLowerCase();


                if (
                    excelClass !==
                    assignedClass
                ) {

                    errors.push({

                        row:
                            row.rowNumber,

                        message:
                            `Teacher can only upload students for assigned class "${teacherClass.className}"`,

                    });

                    continue;

                }

            }


            // ======================================
            // DUPLICATE ROLL
            // ======================================

            const excelRollKey =
                `${className.toLowerCase()}::${rollNo}`;


            if (
                rollNumbersInExcel.has(
                    excelRollKey
                )
            ) {

                errors.push({

                    row:
                        row.rowNumber,

                    message:
                        `Duplicate roll number "${rollNo}" for class "${className}" in Excel file`,

                });

                continue;

            }


            rollNumbersInExcel.add(
                excelRollKey
            );


            // ======================================
            // STATUS
            // ======================================

            let active = true;


            if (status) {

                const normalizedStatus =
                    status.toLowerCase();


                if (
                    normalizedStatus ===
                    "active" ||
                    normalizedStatus ===
                    "true" ||
                    normalizedStatus ===
                    "1"
                ) {

                    active = true;

                } else if (
                    normalizedStatus ===
                    "inactive" ||
                    normalizedStatus ===
                    "false" ||
                    normalizedStatus ===
                    "0"
                ) {

                    active = false;

                } else {

                    errors.push({

                        row:
                            row.rowNumber,

                        message:
                            `Invalid status "${status}". Use Active or Inactive`,

                    });

                    continue;

                }

            }


            validRows.push({

                rowNumber:
                    row.rowNumber,

                rollNo,

                name,

                className,

                active,

            });

        }


        // ==========================================
        // STOP ON VALIDATION ERRORS
        // ==========================================

        if (
            errors.length > 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Excel validation failed",

                totalRows:
                    normalizedRows.length,

                validRows:
                    validRows.length,

                failedRows:
                    errors.length,

                errors,

            });

        }


        // ==========================================
        // FIND CLASSES
        // ==========================================

        let classes;


        if (
            req.user.role === "teacher"
        ) {

            classes = [
                teacherClass,
            ];

        } else {

            const classNames = [
                ...new Set(
                    validRows.map(
                        (row) =>
                            row.className.trim()
                    )
                ),
            ];


            classes =
                await Class.find({

                    className: {
                        $in:
                            classNames,
                    },

                }).select(
                    "_id className classTeacher"
                );

        }


        // ==========================================
        // CLASS MAP
        // ==========================================

        const classMap =
            new Map();


        classes.forEach(
            (classData) => {

                classMap.set(

                    classData.className
                        .trim()
                        .toLowerCase(),

                    classData._id

                );

            }
        );


        // ==========================================
        // INVALID CLASS CHECK
        // ==========================================

        const classErrors = [];


        for (
            const row of validRows
        ) {

            const classKey =
                row.className
                    .trim()
                    .toLowerCase();


            if (
                !classMap.has(
                    classKey
                )
            ) {

                classErrors.push({

                    row:
                        row.rowNumber,

                    message:
                        `Class "${row.className}" does not exist`,

                });

            }

        }


        if (
            classErrors.length > 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Some classes in the Excel file do not exist",

                totalRows:
                    normalizedRows.length,

                failedRows:
                    classErrors.length,

                errors:
                    classErrors,

            });

        }


        // ==========================================
        // FIND EXISTING STUDENTS
        //
        // IMPORTANT:
        // Search by CLASS + ROLL NUMBER
        // ==========================================

        const classRollKeys =
            validRows.map((row) => {

                const classId =
                    classMap.get(
                        row.className
                            .trim()
                            .toLowerCase()
                    );


                return {

                    classId,

                    rollNo:
                        row.rollNo,

                };

            });


        const existingStudents =
            await Student.find({

                $or:
                    classRollKeys.map(
                        ({
                            classId,
                            rollNo,
                        }) => ({

                            classId,

                            rollNo,

                        })
                    ),

            }).select(
                "_id rollNo classId"
            );


        const existingStudentMap =
            new Map();


        existingStudents.forEach(
            (student) => {

                const key =
                    `${String(student.classId)}::${student.rollNo}`;


                existingStudentMap.set(
                    key,
                    student
                );

            }
        );


        // ==========================================
        // TEACHER SECURITY CHECK
        // ==========================================

        if (
            req.user.role === "teacher"
        ) {

            const unauthorizedRows =
                [];


            for (
                const row of validRows
            ) {

                const rowClassId =
                    classMap.get(
                        row.className
                            .trim()
                            .toLowerCase()
                    );


                const key =
                    `${String(rowClassId)}::${row.rollNo}`;


                const existingStudent =
                    existingStudentMap.get(
                        key
                    );


                if (
                    existingStudent &&
                    !teacherHasClassAccess(
                        teacherClass,
                        existingStudent.classId
                    )
                ) {

                    unauthorizedRows.push({

                        row:
                            row.rowNumber,

                        message:
                            `Student with roll number "${row.rollNo}" belongs to another class`,

                    });

                }

            }


            if (
                unauthorizedRows.length > 0
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not allowed to modify students outside your assigned class",

                    errors:
                        unauthorizedRows,

                });

            }

        }


        // ==========================================
        // BULK OPERATIONS
        //
        // IMPORTANT:
        // UPSERT FILTER IS CLASS + ROLL NUMBER
        // ==========================================

        const operations =
            validRows.map(
                (row) => {

                    const classId =
                        classMap.get(
                            row.className
                                .trim()
                                .toLowerCase()
                        );


                    return {

                        updateOne: {

                            filter: {

                                classId,

                                rollNo:
                                    row.rollNo,

                            },

                            update: {

                                $set: {

                                    name:
                                        row.name,

                                    active:
                                        row.active === true,

                                },

                                $setOnInsert: {

                                    classId,

                                },

                            },

                            upsert: true,

                        },

                    };

                }
            );


        // ==========================================
        // EXECUTE
        // ==========================================

        const result =
            await Student.bulkWrite(
                operations,
                {
                    ordered: true,
                }
            );


        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({

            success: true,

            message:
                "Bulk student upload completed successfully",

            summary: {

                total:
                    validRows.length,

                created:
                    result.upsertedCount,

                updated:
                    result.modifiedCount,

                unchanged:
                    result.matchedCount -
                    result.modifiedCount,

            },

        });

    } catch (error) {

        console.error(
            "Bulk Student Upload Error:",
            error
        );


        if (
            error.code === 11000
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Duplicate roll number detected for the same class. Please check the Excel file.",

            });

        }


        return res.status(500).json({

            success: false,

            message:
                "Server error while processing Excel file",

        });

    }

};


// ==========================================
// GET ALL STUDENTS
// GET /api/students
// ==========================================

const getAllStudents = async (
    req,
    res
) => {

    try {

        let query = {};


        if (
            req.user.role === "teacher"
        ) {

            const teacherClass =
                await getTeacherAssignedClass(
                    req
                );


            if (!teacherClass) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not assigned to any class",

                });

            }


            query.classId =
                teacherClass._id;

        }


        const students =
            await Student.find(query)
                .populate(
                    "classId",
                    "className"
                )
                .sort({

                    classId: 1,

                    rollNo: 1,

                });


        return res.status(200).json({

            success: true,

            count:
                students.length,

            students,

        });

    } catch (error) {

        console.error(
            "Get Students Error:",
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
// GET STUDENT BY ID
// GET /api/students/:id
// ==========================================

const getStudentById = async (
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
                    "Invalid student ID",

            });

        }


        const student =
            await Student.findById(id)
                .populate(
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


        if (
            req.user.role === "teacher"
        ) {

            const teacherClass =
                await getTeacherAssignedClass(
                    req
                );


            if (!teacherClass) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not assigned to any class",

                });

            }


            if (
                !teacherHasClassAccess(
                    teacherClass,
                    student.classId?._id
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You can only access students from your assigned class",

                });

            }

        }


        return res.status(200).json({

            success: true,

            student,

        });

    } catch (error) {

        console.error(
            "Get Student By ID Error:",
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
// UPDATE STUDENT
// PUT /api/students/:id
// ==========================================

const updateStudent = async (
    req,
    res
) => {

    try {

        const { id } =
            req.params;


        const {
            rollNo,
            name,
            classId,
            active,
        } = req.body;


        // ==========================================
        // VALIDATE ID
        // ==========================================

        if (
            !mongoose.Types.ObjectId.isValid(
                id
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid student ID",

            });

        }


        // ==========================================
        // FIND STUDENT
        // ==========================================

        const student =
            await Student.findById(id);


        if (!student) {

            return res.status(404).json({

                success: false,

                message:
                    "Student not found",

            });

        }


        // ==========================================
        // TEACHER ACCESS
        // ==========================================

        let teacherClass = null;


        if (
            req.user.role === "teacher"
        ) {

            teacherClass =
                await getTeacherAssignedClass(
                    req
                );


            if (!teacherClass) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not assigned to any class",

                });

            }


            if (
                !teacherHasClassAccess(
                    teacherClass,
                    student.classId
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You can only edit students from your assigned class",

                });

            }

        }


        // ==========================================
        // CHECK FIELDS
        // ==========================================

        if (
            rollNo === undefined &&
            name === undefined &&
            classId === undefined &&
            active === undefined
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "No fields provided for update",

            });

        }


        // ==========================================
        // ROLL NUMBER
        // ==========================================

        if (
            rollNo !== undefined
        ) {

            const normalizedRollNo =
                String(rollNo).trim();


            if (!normalizedRollNo) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Roll number cannot be empty",

                });

            }


            // ==========================================
            // CHECK AGAINST TARGET CLASS
            //
            // If classId is being changed, check the
            // new class.
            //
            // Otherwise check the current class.
            // ==========================================

            const targetClassId =
                classId !== undefined
                    ? classId
                    : student.classId;


            const existingStudent =
                await Student.findOne({

                    classId:
                        targetClassId,

                    rollNo:
                        normalizedRollNo,

                    _id: {
                        $ne: id,
                    },

                });


            if (existingStudent) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Roll number "${normalizedRollNo}" already exists in this class`,

                });

            }


            student.rollNo =
                normalizedRollNo;

        }


        // ==========================================
        // NAME
        // ==========================================

        if (
            name !== undefined
        ) {

            const normalizedName =
                String(name).trim();


            if (!normalizedName) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Name cannot be empty",

                });

            }


            student.name =
                normalizedName;

        }


        // ==========================================
        // CLASS
        // ==========================================

        if (
            classId !== undefined
        ) {

            if (!classId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Class ID is required",

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


            // ======================================
            // TEACHER CANNOT MOVE STUDENT
            // ======================================

            if (
                req.user.role === "teacher"
            ) {

                if (
                    !teacherHasClassAccess(
                        teacherClass,
                        classId
                    )
                ) {

                    return res.status(403).json({

                        success: false,

                        message:
                            "Teachers cannot move students to another class",

                    });

                }

            }


            student.classId =
                classId;

        }


        // ==========================================
        // ACTIVE STATUS
        // ==========================================

        if (
            active !== undefined
        ) {

            const normalizedActive =
                normalizeActiveValue(
                    active
                );


            if (
                !normalizedActive.valid
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Active must be true or false",

                });

            }


            student.active =
                normalizedActive.value;

        }


        // ==========================================
        // SAVE
        // ==========================================

        await student.save();


        // ==========================================
        // RE-FETCH
        // ==========================================

        const updatedStudent =
            await Student.findById(id)
                .populate(
                    "classId",
                    "className"
                );


        if (!updatedStudent) {

            return res.status(404).json({

                success: false,

                message:
                    "Student not found after update",

            });

        }


        console.log(
            "Student updated:",
            {

                id:
                    updatedStudent._id,

                rollNo:
                    updatedStudent.rollNo,

                name:
                    updatedStudent.name,

                active:
                    updatedStudent.active,

                classId:
                    updatedStudent.classId?._id,

            }
        );


        return res.status(200).json({

            success: true,

            message:
                "Student updated successfully",

            student: {

                _id:
                    updatedStudent._id,

                rollNo:
                    updatedStudent.rollNo,

                name:
                    updatedStudent.name,

                classId:
                    updatedStudent.classId,

                active:
                    updatedStudent.active === true,

            },

        });

    } catch (error) {

        console.error(
            "Update Student Error:",
            error
        );


        if (
            error.code === 11000
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "This roll number already exists in the selected class",

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
// DELETE STUDENT
// DELETE /api/students/:id
// ==========================================

const deleteStudent = async (
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
                    "Invalid student ID",

            });

        }


        const student =
            await Student.findById(id);


        if (!student) {

            return res.status(404).json({

                success: false,

                message:
                    "Student not found",

            });

        }


        // ==========================================
        // TEACHER ACCESS
        // ==========================================

        if (
            req.user.role === "teacher"
        ) {

            const teacherClass =
                await getTeacherAssignedClass(
                    req
                );


            if (!teacherClass) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You are not assigned to any class",

                });

            }


            if (
                !teacherHasClassAccess(
                    teacherClass,
                    student.classId
                )
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "You can only delete students from your assigned class",

                });

            }

        }


        // ==========================================
        // DELETE
        // ==========================================

        await Student.findByIdAndDelete(id);


        return res.status(200).json({

            success: true,

            message:
                "Student deleted successfully",

        });

    } catch (error) {

        console.error(
            "Delete Student Error:",
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

    createStudent,

    bulkUploadStudents,

    getAllStudents,

    getStudentById,

    updateStudent,

    deleteStudent,

};