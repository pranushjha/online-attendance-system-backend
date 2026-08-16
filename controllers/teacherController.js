const bcrypt = require("bcryptjs");

const Teacher = require("../models/teacher");
const Class = require("../models/Class");

// ==========================================
// GET ALL TEACHERS
// ==========================================

const getAllTeachers = async (req, res) => {
    try {
        const teachers = await Teacher.find()
            .select("-password")
            .populate("assignedClass", "className")
            .sort({ name: 1 });

        res.status(200).json({
            success: true,
            count: teachers.length,
            teachers,
        });

    } catch (error) {
        console.error("Get Teachers Error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// GET TEACHER BY ID
// ==========================================

const getTeacherById = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id)
            .select("-password")
            .populate("assignedClass", "className");

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Teacher not found",
            });
        }

        res.status(200).json({
            success: true,
            teacher,
        });

    } catch (error) {
        console.error("Get Teacher Error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// CREATE TEACHER
// ==========================================

const createTeacher = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            assignedClass,
        } = req.body;

        // Required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check duplicate email
        const existingTeacher = await Teacher.findOne({
            email: normalizedEmail,
        });

        if (existingTeacher) {
            return res.status(400).json({
                success: false,
                message: "Teacher with this email already exists",
            });
        }

        // Check assigned class
        if (assignedClass) {
            const classData = await Class.findById(assignedClass);

            if (!classData) {
                return res.status(404).json({
                    success: false,
                    message: "Assigned class not found",
                });
            }

            // Make sure class doesn't already have another teacher
            if (classData.classTeacher) {
                return res.status(400).json({
                    success: false,
                    message: "This class already has a class teacher",
                });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create teacher
        const teacher = await Teacher.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            assignedClass: assignedClass || null,
            role: "teacher",
        });

        // Update Class → classTeacher
        if (assignedClass) {
            await Class.findByIdAndUpdate(
                assignedClass,
                {
                    classTeacher: teacher._id,
                }
            );
        }

        // Populate class
        await teacher.populate("assignedClass", "className");

        res.status(201).json({
            success: true,
            message: "Teacher created successfully",

            teacher: {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                assignedClass: teacher.assignedClass,
                role: teacher.role,
            },
        });

    } catch (error) {
        console.error("Create Teacher Error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// UPDATE TEACHER
// ==========================================

const updateTeacher = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            assignedClass,
        } = req.body;

        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Teacher not found",
            });
        }

        // ------------------------------------------
        // UPDATE NAME
        // ------------------------------------------

        if (name) {
            teacher.name = name.trim();
        }

        // ------------------------------------------
        // UPDATE EMAIL
        // ------------------------------------------

        if (email) {
            const normalizedEmail = email.toLowerCase().trim();

            const duplicateTeacher = await Teacher.findOne({
                email: normalizedEmail,
                _id: { $ne: req.params.id },
            });

            if (duplicateTeacher) {
                return res.status(400).json({
                    success: false,
                    message: "Another teacher already uses this email",
                });
            }

            teacher.email = normalizedEmail;
        }

        // ------------------------------------------
        // UPDATE PASSWORD
        // ------------------------------------------

        if (password) {
            teacher.password = await bcrypt.hash(password, 10);
        }

        // ------------------------------------------
        // UPDATE CLASS
        // ------------------------------------------

        if (assignedClass !== undefined) {

            // Remove teacher from old class
            if (teacher.assignedClass) {
                await Class.findByIdAndUpdate(
                    teacher.assignedClass,
                    {
                        $set: {
                            classTeacher: null,
                        },
                    }
                );
            }

            // Assign new class
            if (assignedClass !== null) {

                const newClass = await Class.findById(
                    assignedClass
                );

                if (!newClass) {
                    return res.status(404).json({
                        success: false,
                        message: "New assigned class not found",
                    });
                }

                // Check if another teacher has this class
                if (
                    newClass.classTeacher &&
                    newClass.classTeacher.toString() !==
                    teacher._id.toString()
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "This class already has a class teacher",
                    });
                }

                newClass.classTeacher = teacher._id;

                await newClass.save();

                teacher.assignedClass = assignedClass;

            } else {
                teacher.assignedClass = null;
            }
        }

        await teacher.save();

        await teacher.populate("assignedClass", "className");

        res.status(200).json({
            success: true,
            message: "Teacher updated successfully",

            teacher: {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                assignedClass: teacher.assignedClass,
                role: teacher.role,
            },
        });

    } catch (error) {
        console.error("Update Teacher Error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// DELETE TEACHER
// ==========================================

const deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Teacher not found",
            });
        }

        // Remove teacher from assigned class
        if (teacher.assignedClass) {
            await Class.findByIdAndUpdate(
                teacher.assignedClass,
                {
                    $set: {
                        classTeacher: null,
                    },
                }
            );
        }

        await Teacher.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: "Teacher deleted successfully",
        });

    } catch (error) {
        console.error("Delete Teacher Error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    createTeacher,
    getAllTeachers,
    getTeacherById,
    updateTeacher,
    deleteTeacher,
};