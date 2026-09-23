const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const Teacher = require("../models/teacher");
const Class = require("../models/Class");

const {
    sendVerificationEmail,
} = require("../services/emailService");


// ============================================================
// TOKEN HELPERS
// ============================================================

const createRawToken = () => {
    return crypto.randomBytes(32).toString("hex");
};

const hashToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
};

const getTokenExpiry = () => {
    const hours =
        Number(process.env.EMAIL_TOKEN_EXPIRES_HOURS) || 24;

    return new Date(
        Date.now() + hours * 60 * 60 * 1000
    );
};


// ============================================================
// GET ALL TEACHERS
// ============================================================

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

        console.error(
            "Get Teachers Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ============================================================
// GET TEACHER BY ID
// ============================================================

const getTeacherById = async (req, res) => {
    try {

        const teacher =
            await Teacher.findById(req.params.id)
                .select("-password")
                .populate(
                    "assignedClass",
                    "className"
                );

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

        console.error(
            "Get Teacher Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ============================================================
// CREATE TEACHER
// ============================================================

const createTeacher = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            assignedClass,
        } = req.body;

        // Required fields
        if (!name || !password) {
            return res.status(400).json({
                success: false,
                message: "Teacher name and password are required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email
            ? email.toLowerCase().trim()
            : null;

        // Check duplicate teacher name
        const existingTeacherByName = await Teacher.findOne({
            name: normalizedName,
        }).collation({
            locale: "en",
            strength: 2,
        });

        if (existingTeacherByName) {
            return res.status(400).json({
                success: false,
                message: "A teacher with this name already exists",
            });
        }

        // Check duplicate email only when email is provided
        if (normalizedEmail) {
            const existingTeacherByEmail =
                await Teacher.findOne({
                    email: normalizedEmail,
                });

            if (existingTeacherByEmail) {
                return res.status(400).json({
                    success: false,
                    message: "A teacher with this email already exists",
                });
            }
        }

        // Validate class
        if (assignedClass) {
            const classExists =
                await Class.findById(assignedClass);

            if (!classExists) {
                return res.status(404).json({
                    success: false,
                    message: "Assigned class not found",
                });
            }
        }

        // Hash admin-created password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // Create teacher
        const teacher = await Teacher.create({
            name: normalizedName,
            email: normalizedEmail,
            password: hashedPassword,
            assignedClass: assignedClass || null,
            role: "teacher",

            passwordSet: true,

            // Email verification is no longer used
            isEmailVerified: true,
            emailVerificationTokenHash: null,
            emailVerificationExpires: null,

            passwordResetTokenHash: null,
            passwordResetExpires: null,
        });

        // Assign class teacher
        if (assignedClass) {
            await Class.findByIdAndUpdate(
                assignedClass,
                {
                    teacher: teacher._id,
                }
            );
        }

        const teacherResponse =
            await Teacher.findById(teacher._id)
                .select("-password")
                .populate(
                    "assignedClass",
                    "className"
                );

        return res.status(201).json({
            success: true,
            message: "Teacher created successfully",
            teacher: teacherResponse,
        });

    } catch (error) {
        console.error(
            "Create Teacher Error:",
            error
        );

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Teacher email already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

const updateTeacher = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            assignedClass,
        } = req.body;

        const teacher =
            await Teacher.findById(req.params.id);

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message: "Teacher not found",
            });
        }

        const oldName = teacher.name;

        // Update name
        if (name !== undefined) {
            const normalizedName = name.trim();

            if (!normalizedName) {
                return res.status(400).json({
                    success: false,
                    message: "Teacher name cannot be empty",
                });
            }

            const duplicateTeacher =
                await Teacher.findOne({
                    name: normalizedName,
                    _id: {
                        $ne: teacher._id,
                    },
                }).collation({
                    locale: "en",
                    strength: 2,
                });

            if (duplicateTeacher) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A teacher with this name already exists",
                });
            }

            teacher.name = normalizedName;
        }

        // Update email as optional contact information
        if (email !== undefined) {
            const normalizedEmail = email
                ? email.toLowerCase().trim()
                : null;

            if (normalizedEmail) {
                const duplicateEmail =
                    await Teacher.findOne({
                        email: normalizedEmail,
                        _id: {
                            $ne: teacher._id,
                        },
                    });

                if (duplicateEmail) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "A teacher with this email already exists",
                    });
                }
            }

            teacher.email = normalizedEmail;
        }

        // Update password
        if (password) {
            if (password.length < 8) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Password must be at least 8 characters",
                });
            }

            teacher.password =
                await bcrypt.hash(password, 10);

            teacher.passwordSet = true;
        }

        // Update class
        if (assignedClass !== undefined) {
            if (assignedClass) {
                const classExists =
                    await Class.findById(assignedClass);

                if (!classExists) {
                    return res.status(404).json({
                        success: false,
                        message: "Assigned class not found",
                    });
                }
            }

            // Remove teacher from old class
            if (
                teacher.assignedClass &&
                String(teacher.assignedClass) !==
                    String(assignedClass || "")
            ) {
                await Class.findByIdAndUpdate(
                    teacher.assignedClass,
                    {
                        $unset: {
                            teacher: 1,
                        },
                    }
                );
            }

            teacher.assignedClass =
                assignedClass || null;
        }

        // Email verification is no longer used
        teacher.isEmailVerified = true;
        teacher.emailVerificationTokenHash = null;
        teacher.emailVerificationExpires = null;

        await teacher.save();

        // Assign teacher to new class
        if (teacher.assignedClass) {
            await Class.findByIdAndUpdate(
                teacher.assignedClass,
                {
                    teacher: teacher._id,
                }
            );
        }

        const teacherResponse =
            await Teacher.findById(teacher._id)
                .select("-password")
                .populate(
                    "assignedClass",
                    "className"
                );

        return res.status(200).json({
            success: true,
            message: "Teacher updated successfully",
            teacher: teacherResponse,
        });

    } catch (error) {
        console.error(
            "Update Teacher Error:",
            error
        );

        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Teacher email already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

const deleteTeacher = async (req, res) => {

    try {

        const teacher =
            await Teacher.findById(
                req.params.id
            );

        if (!teacher) {
            return res.status(404).json({
                success: false,
                message:
                    "Teacher not found",
            });
        }

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

        await Teacher.findByIdAndDelete(
            teacher._id
        );

        res.status(200).json({
            success: true,
            message:
                "Teacher deleted successfully",
        });

    } catch (error) {

        console.error(
            "Delete Teacher Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


module.exports = {
    createTeacher,
    getAllTeachers,
    getTeacherById,
    updateTeacher,
    deleteTeacher,
};
