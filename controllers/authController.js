const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");
const Teacher = require("../models/Teacher");

// ==========================================
// GENERATE JWT TOKEN
// ==========================================

const generateToken = (userId, role) => {
    return jwt.sign(
        {
            id: userId,
            role: role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );
};


// ==========================================
// CREATE ADMIN
// ==========================================

const createAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({
            email: normalizedEmail,
        });

        if (existingAdmin) {
            return res.status(400).json({
                success: false,
                message: "Admin with this email already exists",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin
        const admin = await Admin.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "admin",
        });

        // Response - password is NOT returned
        res.status(201).json({
            success: true,
            message: "Admin created successfully",

            admin: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
            },
        });

    } catch (error) {
        console.error("Create Admin Error:", error);

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

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required",
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Check if teacher already exists
        const existingTeacher = await Teacher.findOne({
            email: normalizedEmail,
        });

        if (existingTeacher) {
            return res.status(400).json({
                success: false,
                message: "Teacher with this email already exists",
            });
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

        // Response - password is NOT returned
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
// ADMIN LOGIN
// ==========================================

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Find admin
        const admin = await Admin.findOne({
            email: normalizedEmail,
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Compare password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            admin.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Generate JWT
        const token = generateToken(admin._id, "admin");

        // Login response
        res.status(200).json({
            success: true,
            message: "Admin login successful",

            token,

            user: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: "admin",
            },
        });

    } catch (error) {
        console.error("Admin Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// TEACHER LOGIN
// ==========================================

const teacherLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        // Normalize email
        const normalizedEmail = email.toLowerCase().trim();

        // Find teacher
        const teacher = await Teacher.findOne({
            email: normalizedEmail,
        });

        if (!teacher) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Compare password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            teacher.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        // Generate JWT
        const token = generateToken(teacher._id, "teacher");

        // Login response
        res.status(200).json({
            success: true,
            message: "Teacher login successful",

            token,

            user: {
                _id: teacher._id,
                name: teacher.name,
                email: teacher.email,
                assignedClass: teacher.assignedClass,
                role: "teacher",
            },
        });

    } catch (error) {
        console.error("Teacher Login Error:", error);

        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


// ==========================================
// EXPORT FUNCTIONS
// ==========================================

module.exports = {
    createAdmin,
    createTeacher,
    adminLogin,
    teacherLogin,
};