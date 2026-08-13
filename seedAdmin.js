const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("./models/Admin");

const seedAdmin = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);

        console.log("MongoDB connected");

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({
            email: "admin@college.com",
        });

        if (existingAdmin) {
            console.log("Admin already exists");
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash("123456", 10);

        // Create admin
        const admin = await Admin.create({
            name: "College Admin",
            email: "admin@college.com",
            password: hashedPassword,
            role: "admin",
        });

        console.log("Admin created successfully");
        console.log("Email:", admin.email);
        console.log("Password: 123456");

        process.exit(0);
    } catch (error) {
        console.error("Error creating admin:", error);
        process.exit(1);
    }
};

seedAdmin();