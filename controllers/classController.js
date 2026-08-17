const mongoose = require("mongoose");

const Class = require("../models/Class");
const Teacher = require("../models/teacher");
const Student = require("../models/Student");    

// ==========================================
// CREATE CLASS
// ==========================================

const createClass = async (req, res) => {
    try {
        const { className, classTeacher } = req.body;

        // ==========================================
        // VALIDATE CLASS NAME
        // ==========================================

        if (!className || !className.trim()) {
            return res.status(400).json({
                success: false,
                message: "Class name is required",
            });
        }

        const normalizedClassName = className.trim();

        // ==========================================
        // VALIDATE CLASS TEACHER ID
        // ==========================================

        if (
            classTeacher !== undefined &&
            classTeacher !== null &&
            !mongoose.Types.ObjectId.isValid(classTeacher)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid teacher ID",
            });
        }

        // ==========================================
        // CHECK DUPLICATE CLASS
        // ==========================================

        const existingClass = await Class.findOne({
            className: normalizedClassName,
        });

        if (existingClass) {
            return res.status(400).json({
                success: false,
                message: "Class already exists",
            });
        }

        let teacher = null;

        // ==========================================
        // CHECK TEACHER
        // ==========================================

        if (classTeacher) {
            teacher = await Teacher.findById(classTeacher);

            if (!teacher) {
                return res.status(404).json({
                    success: false,
                    message: "Teacher not found",
                });
            }

            // Prevent assigning one teacher to multiple classes
            if (teacher.assignedClass) {
                return res.status(400).json({
                    success: false,
                    message: "This teacher is already assigned to a class",
                });
            }
        }

        // ==========================================
        // CREATE CLASS
        // ==========================================

        const newClass = await Class.create({
            className: normalizedClassName,
            classTeacher: classTeacher || null,
        });

        // ==========================================
        // UPDATE TEACHER ASSIGNMENT
        // ==========================================

        if (teacher) {
            teacher.assignedClass = newClass._id;
            await teacher.save();
        }

        // ==========================================
        // POPULATE TEACHER
        // ==========================================

        await newClass.populate(
            "classTeacher",
            "name email assignedClass"
        );

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(201).json({
            success: true,
            message: "Class created successfully",
            class: newClass,
        });

    } catch (error) {
        console.error("Create Class Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET ALL CLASSES
// ==========================================

const getAllClasses = async (req, res) => {
    try {
        const classes = await Class.find()
            .populate("classTeacher", "name email assignedClass")
            .sort({ className: 1 });

        return res.status(200).json({
            success: true,
            count: classes.length,
            classes,
        });

    } catch (error) {
        console.error("Get Classes Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET CLASS BY ID
// ==========================================

const getClassById = async (req, res) => {
    try {
        const { id } = req.params;

        // ==========================================
        // VALIDATE ID
        // ==========================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid class ID",
            });
        }

        // ==========================================
        // FIND CLASS
        // ==========================================

        const classData = await Class.findById(id)
            .populate("classTeacher", "name email assignedClass");

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        return res.status(200).json({
            success: true,
            class: classData,
        });

    } catch (error) {
        console.error("Get Class Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// UPDATE CLASS
// ==========================================

const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { className, classTeacher } = req.body;

        // ==========================================
        // VALIDATE CLASS ID
        // ==========================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid class ID",
            });
        }

        // ==========================================
        // FIND CLASS
        // ==========================================

        const existingClass = await Class.findById(id);

        if (!existingClass) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        // ==========================================
        // UPDATE CLASS NAME
        // ==========================================

        if (className !== undefined) {
            if (!className.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Class name cannot be empty",
                });
            }

            const normalizedClassName = className.trim();

            const duplicateClass = await Class.findOne({
                className: normalizedClassName,
                _id: { $ne: id },
            });

            if (duplicateClass) {
                return res.status(400).json({
                    success: false,
                    message: "Another class with this name already exists",
                });
            }

            existingClass.className = normalizedClassName;
        }

        // ==========================================
        // UPDATE CLASS TEACHER
        // ==========================================

        if (classTeacher !== undefined) {

            // ------------------------------------------
            // REMOVE CURRENT TEACHER
            // ------------------------------------------

            if (existingClass.classTeacher) {
                const oldTeacher = await Teacher.findById(
                    existingClass.classTeacher
                );

                if (oldTeacher) {
                    oldTeacher.assignedClass = null;
                    await oldTeacher.save();
                }
            }

            // ------------------------------------------
            // REMOVE TEACHER COMPLETELY
            // ------------------------------------------

            if (classTeacher === null) {
                existingClass.classTeacher = null;
            }

            // ------------------------------------------
            // ASSIGN NEW TEACHER
            // ------------------------------------------

            else {

                if (!mongoose.Types.ObjectId.isValid(classTeacher)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid teacher ID",
                    });
                }

                const newTeacher = await Teacher.findById(classTeacher);

                if (!newTeacher) {
                    return res.status(404).json({
                        success: false,
                        message: "Teacher not found",
                    });
                }

                // If assigning the same teacher, don't reject
                const isSameTeacher =
                    existingClass.classTeacher &&
                    existingClass.classTeacher.toString() ===
                        classTeacher.toString();

                if (
                    !isSameTeacher &&
                    newTeacher.assignedClass &&
                    newTeacher.assignedClass.toString() !== id.toString()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "This teacher is already assigned to another class",
                    });
                }

                existingClass.classTeacher = classTeacher;

                newTeacher.assignedClass = existingClass._id;
                await newTeacher.save();
            }
        }

        // ==========================================
        // SAVE CLASS
        // ==========================================

        await existingClass.save();

        // ==========================================
        // POPULATE TEACHER
        // ==========================================

        await existingClass.populate(
            "classTeacher",
            "name email assignedClass"
        );

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            message: "Class updated successfully",
            class: existingClass,
        });

    } catch (error) {
        console.error("Update Class Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// DELETE CLASS
// ==========================================

const deleteClass = async (req, res) => {
    try {
        const { id } = req.params;

        // ==========================================
        // VALIDATE ID
        // ==========================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid class ID",
            });
        }

        // ==========================================
        // FIND CLASS
        // ==========================================

        const existingClass = await Class.findById(id);

        if (!existingClass) {
            return res.status(404).json({
                success: false,
                message: "Class not found",
            });
        }

        // ==========================================
        // REMOVE TEACHER ASSIGNMENT
        // ==========================================

        if (existingClass.classTeacher) {
            const teacher = await Teacher.findById(
                existingClass.classTeacher
            );

            if (teacher) {
                teacher.assignedClass = null;
                await teacher.save();
            }
        }

        // ==========================================
        // DELETE CLASS
        // ==========================================

        await Class.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Class deleted successfully",
        });

    } catch (error) {
        console.error("Delete Class Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};





// ==========================================
// GET MY CLASS
// GET /api/classes/my-class
// TEACHER ONLY
// ==========================================

const getMyClass = async (req, res) => {
    try {
        // ==========================================
        // CHECK TEACHER AUTHENTICATION
        // ==========================================

        if (!req.user || req.user.role !== "teacher") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Teacher access required.",
            });
        }

        const teacherId = req.user.id;

        // ==========================================
        // FIND CLASS ASSIGNED TO TEACHER
        // ==========================================

        const classData = await Class.findOne({
            classTeacher: teacherId,
        }).populate(
            "classTeacher",
            "name email assignedClass"
        );

        if (!classData) {
            return res.status(404).json({
                success: false,
                message: "No class is assigned to you.",
            });
        }

        // ==========================================
        // GET ACTIVE STUDENTS
        // ==========================================

        const students = await Student.find({
            classId: classData._id,
            active: true,
        })
            .select("rollNo name email")
            .sort({ rollNo: 1 });

        // ==========================================
        // RESPONSE
        // ==========================================

        return res.status(200).json({
            success: true,
            class: classData,
            students,
            studentCount: students.length,
        });

    } catch (error) {
        console.error("Get My Class Error:", error);

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
    createClass,
    getAllClasses,
    getClassById,
    updateClass,
    deleteClass,
    getMyClass,
};