const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
    {
        // ==========================================
        // TEACHER NAME
        // ==========================================

        name: {
            type: String,
            required: true,
            trim: true,
        },

        // ==========================================
        // EMAIL
        // ==========================================

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        // ==========================================
        // PASSWORD
        // ==========================================

        password: {
            type: String,
            required: true,
        },

        // ==========================================
        // ASSIGNED CLASS
        // ==========================================

        assignedClass: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            default: null,
        },

        // ==========================================
        // ROLE
        // ==========================================

        role: {
            type: String,
            enum: ["teacher"],
            default: "teacher",
        },
    },
    {
        timestamps: true,
    }
);

module.exports =
    mongoose.models.Teacher ||
    mongoose.model("Teacher", teacherSchema);
