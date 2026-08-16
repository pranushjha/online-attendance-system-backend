const Student = require("../models/Student");
const Class = require("../models/Class");
const mongoose = require("mongoose");

// ==========================================
// CREATE STUDENT
// POST /api/students
// ==========================================

const createStudent = async (req, res) => {
    try {
        const { rollNo, name, classId } = req.body;

        // ==========================================
        // CHECK REQUIRED FIELDS
        // ==========================================

        if (!rollNo || !name || !classId) {
            return res.status(400).json({
                success: false,
                message: "Roll number, name and class are required",
            });
        }

        // ==========================================
        // VALIDATE CLASS ID
        // ==========================================

        if (!mongoose.Types.ObjectId.isValid(classId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid class ID",
            });
        }

        const normalizedRollNo = rollNo.trim();
        const normalizedName = name.trim();

        if (!normalizedRollNo) {
            return res.status(400).json({
                success: false,
                message: "Roll number cannot be empty",
            });
        }

        if (!normalizedName) {
            return res.status(400).json({
                success: false,
                message: "Student name cannot be empty",
            });
        }

        // ==========================================
        // CHECK DUPLICATE ROLL NUMBER
        // ==========================================

        const existingStudent = await Student.findOne({
            rollNo: normalizedRollNo,
        });

        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: "A student with this roll number already exists",
            });
        }

        // ==========================================
        // CHECK CLASS EXISTS
        // ==========================================

        const classData = await Class.findById(classId);

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        // ==========================================
        // CREATE STUDENT
        // ==========================================

        const student = await Student.create({
            rollNo: normalizedRollNo,
            name: normalizedName,
            classId: classId,
            active: true,
        });

        // ==========================================
        // POPULATE CLASS
        // ==========================================

        await student.populate("classId", "className");

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(201).json({
            success: true,
            message: "Student created successfully",

            student: {
                _id: student._id,
                rollNo: student.rollNo,
                name: student.name,
                classId: student.classId,
                active: student.active,
            },
        });

    } catch (error) {
        console.error("Create Student Error:", error);

        // Handle duplicate roll number
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A student with this roll number already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET ALL STUDENTS
// GET /api/students
// ==========================================

const getAllStudents = async (req, res) => {
    try {
        const students = await Student.find()
            .populate("classId", "className")
            .sort({ rollNo: 1 });

        return res.status(200).json({
            success: true,
            count: students.length,
            students,
        });

    } catch (error) {
        console.error("Get Students Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET STUDENT BY ID
// GET /api/students/:id
// ==========================================

const getStudentById = async (req, res) => {
    try {
        const { id } = req.params;

        // ==========================================
        // VALIDATE STUDENT ID
        // ==========================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID",
            });
        }

        // ==========================================
        // FIND STUDENT
        // ==========================================

        const student = await Student.findById(id)
            .populate("classId", "className");

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        return res.status(200).json({
            success: true,
            student,
        });

    } catch (error) {
        console.error("Get Student By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// UPDATE STUDENT
// PUT /api/students/:id
// ==========================================

const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            rollNo,
            name,
            classId,
            active,
        } = req.body;

        // ==========================================
        // VALIDATE STUDENT ID
        // ==========================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID",
            });
        }

        // ==========================================
        // FIND STUDENT
        // ==========================================

        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        // ==========================================
        // CHECK AT LEAST ONE FIELD
        // ==========================================

        if (
            rollNo === undefined &&
            name === undefined &&
            classId === undefined &&
            active === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "No fields provided for update",
            });
        }

        // ==========================================
        // UPDATE ROLL NUMBER
        // ==========================================

        if (rollNo !== undefined) {
            if (typeof rollNo !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Roll number must be a string",
                });
            }

            const normalizedRollNo = rollNo.trim();

            if (!normalizedRollNo) {
                return res.status(400).json({
                    success: false,
                    message: "Roll number cannot be empty",
                });
            }

            const existingStudent = await Student.findOne({
                rollNo: normalizedRollNo,
                _id: { $ne: id },
            });

            if (existingStudent) {
                return res.status(400).json({
                    success: false,
                    message: "A student with this roll number already exists",
                });
            }

            student.rollNo = normalizedRollNo;
        }

        // ==========================================
        // UPDATE NAME
        // ==========================================

        if (name !== undefined) {
            if (typeof name !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Name must be a string",
                });
            }

            const normalizedName = name.trim();

            if (!normalizedName) {
                return res.status(400).json({
                    success: false,
                    message: "Name cannot be empty",
                });
            }

            student.name = normalizedName;
        }

        // ==========================================
        // UPDATE CLASS
        // ==========================================

        if (classId !== undefined) {

            // Allow class to be changed, but don't allow null
            if (!classId) {
                return res.status(400).json({
                    success: false,
                    message: "Class ID is required",
                });
            }

            if (!mongoose.Types.ObjectId.isValid(classId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid class ID",
                });
            }

            const classData = await Class.findById(classId);

            if (!classData) {
                return res.status(404).json({
                    success: false,
                    message: "Class not found",
                });
            }

            student.classId = classId;
        }

        // ==========================================
        // UPDATE ACTIVE STATUS
        // ==========================================

        if (active !== undefined) {

            if (typeof active !== "boolean") {
                return res.status(400).json({
                    success: false,
                    message: "Active must be true or false",
                });
            }

            student.active = active;
        }

        // ==========================================
        // SAVE
        // ==========================================

        await student.save();

        // ==========================================
        // POPULATE CLASS
        // ==========================================

        await student.populate("classId", "className");

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            message: "Student updated successfully",

            student: {
                _id: student._id,
                rollNo: student.rollNo,
                name: student.name,
                classId: student.classId,
                active: student.active,
            },
        });

    } catch (error) {
        console.error("Update Student Error:", error);

        // Handle duplicate roll number
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "A student with this roll number already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// DELETE STUDENT
// DELETE /api/students/:id
// ==========================================

const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;

        // ==========================================
        // VALIDATE STUDENT ID
        // ==========================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid student ID",
            });
        }

        // ==========================================
        // FIND STUDENT
        // ==========================================

        const student = await Student.findById(id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Student not found",
            });
        }

        // ==========================================
        // DELETE STUDENT
        // ==========================================

        await Student.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Student deleted successfully",
        });

    } catch (error) {
        console.error("Delete Student Error:", error);

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
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
};